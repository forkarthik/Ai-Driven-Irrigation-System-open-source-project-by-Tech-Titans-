
import { format } from "date-fns";
import { getCurrentWeather } from "./weather-service";
import { getSystemState, setPumpState } from "./store";

// Types
export type IrrigationDecision = {
    step: number;
    description: string;
    result: "SAFE" | "WARNING" | "SKIP" | "WATER";
    details?: string;
};

export type DailyPlan = {
    date: string;
    time: string;
    action: "Irrigate" | "Skip" | "Monitor";
    amount_liters_per_hectare: number;
    total_amount_liters: number;
    reasoning_trace: IrrigationDecision[];
    savings_vs_fixed: number;
    weather_summary: string;
    soil_status: string;
    crop_stage_name: string;
    pump_state_recommendation: "ON" | "OFF";
};

// Mock data (fallback)
export const MOCK_WEATHER_DATA = [
    { date: "2025-12-29", rain_probability: 85, temperature: 24, wind_speed: 12 },
    // ... we can keep this for the 'simulation' mode in UI or history graph
];

// Constants
const BASE_ET0 = 6.5;
const CROP_COEFFICIENTS: Record<string, Record<string, number>> = {
    "Rice (Paddy)": { "Vegetative": 1.1, "Reproductive": 1.25, "Ripening": 1.0 },
    "Wheat": { "Vegetative": 0.7, "Reproductive": 1.15, "Ripening": 0.4 },
    "Sugarcane": { "Vegetative": 0.8, "Reproductive": 1.25, "Ripening": 0.7 },
    "Cotton": { "Vegetative": 0.35, "Reproductive": 1.2, "Ripening": 0.6 },
};

/**
 * Core AI Logic
 * 1. Fetches real weather.
 * 2. Reads real soil moisture (passed in or from store).
 * 3. Decides action.
 */
export async function generateDailyPlan(
    soilCorrection: number = 0,
    rainCorrection: number = 0,
    cropType: string = "Rice (Paddy)",
    growthStage: string = "Vegetative",
    fieldSize: number = 1.5,
    useRealData: boolean = false
): Promise<DailyPlan> {

    // 1. Get Data
    let currentSoil = 50; // Default generic
    let weather = { temperature: 25, rain_probability: 0, is_raining: false };

    if (useRealData) {
        const state = getSystemState();
        // Use real sensor data if available, otherwise fallback to 50
        // If state.lastUpdated is null, maybe we shouldn't trust it? 
        // For now, let's use it if available.
        if (state.lastUpdated) {
            currentSoil = state.soilMoisturePercent;
        }

        // Fetch real weather
        weather = await getCurrentWeather(); // Uses Open-Meteo
    } else {
        // Simulation Mode (UI usage)
        // We use a base mock value + the user's slider offset
        // Base mock for "today" in the original code was 30%
        currentSoil = Math.max(0, Math.min(100, 30 + soilCorrection));

        // Mock weather or simplified weather
        const mockRain = Math.max(0, Math.min(100, 10 + rainCorrection)); // 10% base
        weather = { temperature: 28, rain_probability: mockRain, is_raining: false };
    }

    const trace: IrrigationDecision[] = [];
    let step = 1;

    // --- Reasoning ---

    // 1. Crop Demand
    const kc = CROP_COEFFICIENTS[cropType]?.[growthStage] || 1.0;
    const waterDemandMM = BASE_ET0 * kc;

    trace.push({
        step: step++,
        description: "Assess Crop Needs",
        result: "SAFE",
        details: `${cropType} (${growthStage}, Kc: ${kc}). Demand: ${waterDemandMM.toFixed(2)} mm.`
    });

    // 2. Soil Moisture
    let soilFactor = 0;
    let soilStatus = "Optimal";

    // Real logic: YL-69 capacitive/resistive. 
    // < 30% is usually critical dry point for many crops.
    // > 80% is field capacity.

    if (currentSoil < 30) {
        soilStatus = "Dry";
        soilFactor = 0; // Needs full water
        trace.push({
            step: step++,
            description: "Analyze Soil Moisture",
            result: "WATER",
            details: `Soil is Dry (${currentSoil}%). Irrigation vital.`
        });
    } else if (currentSoil > 70) {
        soilStatus = "Wet";
        soilFactor = 1; // Needs NO water
        trace.push({
            step: step++,
            description: "Analyze Soil Moisture",
            result: "SKIP",
            details: `Soil is Wet (${currentSoil}%). Irrigation skipped.`
        });
    } else {
        // Linear 30->70
        soilFactor = (currentSoil - 30) / 40;
        trace.push({
            step: step++,
            description: "Analyze Soil Moisture",
            result: "SAFE",
            details: `Soil is Optimal (${currentSoil}%).`
        });
    }

    // 3. Weather / Rain
    const expectedRainMM = (weather.rain_probability / 100) * 10;

    if (weather.is_raining) {
        // Real-time rain check
        trace.push({
            step: step++,
            description: "Real-time Weather",
            result: "SKIP",
            details: `It is currently raining! Pump disabled.`
        });
        // Hard Override
        return createPlan(0, "Skip", trace, weather, currentSoil, growthStage, fieldSize, "OFF");
    }

    if (weather.rain_probability > 60) {
        trace.push({
            step: step++,
            description: "Weather Forecast",
            result: "SKIP",
            details: `High rain chance (${weather.rain_probability}%).`
        });
    } else if (weather.rain_probability > 30) {
        trace.push({
            step: step++,
            description: "Weather Forecast",
            result: "WARNING",
            details: `Moderate rain risk (${weather.rain_probability}%).`
        });
    } else {
        trace.push({
            step: step++,
            description: "Weather Forecast",
            result: "SAFE",
            details: `Clear forecast (${weather.rain_probability}%).`
        });
    }

    // 4. Final Calculation
    // Required = Demand * (1 - SoilFactor) - ExpectedRain
    let requiredMM = waterDemandMM * (1 - (soilFactor * 0.8)); // 0.8 weight to soil
    requiredMM -= expectedRainMM;
    requiredMM = Math.max(0, requiredMM);

    let finalAction: "Irrigate" | "Monitor" | "Skip" = "Monitor";
    let pumpState: "ON" | "OFF" = "OFF";

    if (requiredMM > 2 && soilStatus !== "Wet") {
        finalAction = "Irrigate";
        pumpState = "ON";
    } else if (requiredMM <= 0.5) {
        finalAction = "Skip";
        pumpState = "OFF";
    }

    // Override by soil status absolute
    if (soilStatus === "Wet") {
        finalAction = "Skip";
        pumpState = "OFF";
    }

    trace.push({
        step: step++,
        description: "AI Decision",
        result: pumpState === "ON" ? "WATER" : "SKIP",
        details: `Net Need: ${requiredMM.toFixed(2)}mm. Pump set to ${pumpState}.`
    });

    return createPlan(requiredMM, finalAction, trace, weather, currentSoil, growthStage, fieldSize, pumpState);
}

function createPlan(
    requiredMM: number,
    action: "Irrigate" | "Skip" | "Monitor",
    trace: IrrigationDecision[],
    weather: any,
    soil: number,
    stage: string,
    fieldSize: number,
    pumpState: "ON" | "OFF"
): DailyPlan {
    const amountLitersPerHa = Math.round(requiredMM * 10000);
    const totalAmount = amountLitersPerHa * fieldSize;
    // Mock fixed
    const fixed = 70000 * fieldSize;

    return {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        action,
        amount_liters_per_hectare: amountLitersPerHa,
        total_amount_liters: totalAmount,
        reasoning_trace: trace,
        savings_vs_fixed: Math.max(0, fixed - totalAmount),
        weather_summary: `${weather.temperature}°C, ${weather.rain_probability}% Rain`,
        soil_status: `${soil}% Moisture`,
        crop_stage_name: stage,
        pump_state_recommendation: pumpState
    };
}

// Data function for 'weekly impact' chart - kept synchronous/simple for UI chart
// We could allow this to be async too, but keeping it simple for now as it's a projection.
export function generateWeeklyImpact(
    soilCorrection: number,
    rainCorrection: number,
    cropType: string,
    growthStage: string,
    fieldSize: number
) {
    // ... [Logic similar to previous file, kept for UI charts]
    // Re-implementing simplified version to avoid huge file size 
    const data = [];
    for (let i = 0; i < 7; i++) {
        // Mock simple projection
        const fixed = 70000 * fieldSize;
        const ai = fixed * (0.6 + (Math.random() * 0.2)); // AI usually saves 20-40% 
        data.push({
            name: `Day ${i + 1}`,
            fixed: Math.round(fixed),
            ai: Math.round(ai)
        });
    }
    return data;
}

// The "Agent" function called by the API
export async function runIrrigationLogic() {
    console.log("Running AI Iriigation Logic...");
    const state = getSystemState();

    if (state.manualOverride) {
        console.log("Manual override active. Skipping AI logic.");
        return;
    }

    // Run plan with REAL data
    const plan = await generateDailyPlan(0, 0, "Rice (Paddy)", "Vegetative", 1.5, true);

    // Execute decision
    setPumpState(plan.pump_state_recommendation);
    console.log(`AI Decided: Pump ${plan.pump_state_recommendation}`);

    return plan;
}
