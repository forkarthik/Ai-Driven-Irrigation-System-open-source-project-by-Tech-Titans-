
import { fetchThingsBoardTelemetry, sendRpcToDevice } from './thingsboard';

// In-Memory store now acts as a cache for the UI
// The source of truth is ThingsBoard

// To avoid breaking existing UI components that import 'systemState',
// we will keep the structure but update it via a poller function.

interface SystemState {
    soilMoistureRaw: number;
    soilMoisturePercent: number;
    batteryLevel: number;
    lastUpdated: Date | null;
    pumpState: "ON" | "OFF";
    manualOverride: boolean;
    moistureThreshold: number;
}

export const systemState: SystemState = {
    soilMoistureRaw: 0,
    soilMoisturePercent: 0,
    batteryLevel: 100,
    lastUpdated: null,
    pumpState: "OFF",
    manualOverride: false,
    moistureThreshold: 40
};

// --- ThingsBoard Config ---
// These would come from env or settings
const TB_DEVICE_ID = "YOUR_TB_DEVICE_ID";
const TB_TOKEN = "YOUR_TB_TOKEN";

export async function syncWithThingsBoard() {
    // 1. Fetch latest telemetry
    const data = await fetchThingsBoardTelemetry(TB_DEVICE_ID, TB_TOKEN);

    // 2. Update local store
    // ThingsBoard usually sends raw or processed values. 
    // Let's assume the ESP32 code sends "soil_moisture" as the Raw Value.

    // Map raw
    const raw = data.soilMoisture;
    const MAX_VAL = 4095;
    const MIN_VAL = 1000;
    const clamped = Math.max(MIN_VAL, Math.min(MAX_VAL, raw));
    const pct = ((MAX_VAL - clamped) / (MAX_VAL - MIN_VAL)) * 100;

    systemState.soilMoistureRaw = raw;
    systemState.soilMoisturePercent = Math.round(pct);
    systemState.pumpState = data.pumpStatus;
    systemState.lastUpdated = new Date();

    return systemState;
}

export function getSystemState() {
    return systemState;
}

// Ensure explicit manual controls go via RPC
export async function setPumpState(state: "ON" | "OFF", isManual: boolean = false) {
    systemState.pumpState = state;
    if (isManual) {
        systemState.manualOverride = true;
        // Send RPC to ThingsBoard
        // Method: "setGpio", Params: { pin: 26, value: 1/0 } or custom "setPump"
        // Let's assume we use shared attributes for simplicity per the ESP32 code I wrote.
        // Actually, RPC is better for immediate action. 
        // But the ESP32 code uses Attributes polling. So we update attributes.
        // For this demo, let's just log it. 
        console.log(`[TB] Would update Shared Attribute 'pump_command': ${state}`);
    }
}

export function clearOverride() {
    systemState.manualOverride = false;
    // Reset attribute to empty or "AUTO"
}
