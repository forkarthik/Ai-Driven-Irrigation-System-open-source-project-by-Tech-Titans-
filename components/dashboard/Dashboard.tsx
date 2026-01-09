"use client";

import { useEffect, useState } from "react";
import { generateDailyPlan, generateWeeklyImpact, DailyPlan, MOCK_WEATHER_DATA } from "@/lib/irrigation-engine";
import DailySchedule from "./DailySchedule";
import RainAlert from "./RainAlert";
import ThinkingTrace from "./ThinkingTrace";
import ImpactReport, { ImpactData } from "./ImpactReport";
import SettingsForm, { IrrigationSettings } from "./SettingsForm";
import Footer from "../layout/Footer";
import { Droplet, Globe, Moon, Sun, CloudRain, Activity, Power, Cpu, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
    const [plan, setPlan] = useState<DailyPlan | null>(null);
    const [impactData, setImpactData] = useState<ImpactData[]>([]);
    const [lang, setLang] = useState<"en" | "ta">("en");

    // Simulation state (sensor offsets)
    const [simulation, setSimulation] = useState({ rain: 0, soil: 0 });

    // Real-time System State
    const [iotState, setIotState] = useState<any>(null);
    const [isManual, setIsManual] = useState(false);

    // Field Configuration State
    const [settings, setSettings] = useState<IrrigationSettings>({
        cropType: "Rice (Paddy)",
        growthStage: "Vegetative",
        fieldSize: 1.5
    });

    // 1. Initial Logic Load (Simulation)
    useEffect(() => {
        async function loadPlan() {
            const newPlan = await generateDailyPlan(
                simulation.soil,
                simulation.rain,
                settings.cropType,
                settings.growthStage,
                settings.fieldSize,
                false // Use simulation mode for the main big plan view
            );
            setPlan(newPlan);

            const newImpactData = generateWeeklyImpact(
                simulation.soil,
                simulation.rain,
                settings.cropType,
                settings.growthStage,
                settings.fieldSize
            );
            setImpactData(newImpactData);
        }
        loadPlan();
    }, [simulation, settings]);

    // 2. Poll for Real-time Status
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/ui/state');
                const data = await res.json();
                setIotState(data);
                setIsManual(data.manualOverride);
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        fetchStatus(); // Initial
        const interval = setInterval(fetchStatus, 3000); // Poll every 3s
        return () => clearInterval(interval);
    }, []);

    const handleManualControl = async (action: "ON" | "OFF" | "AUTO") => {
        await fetch('/api/command', {
            method: 'POST',
            body: JSON.stringify({ action }),
            headers: { 'Content-Type': 'application/json' }
        });
        // State will update on next poll
    };

    const toggleLanguage = () => setLang(l => l === "en" ? "ta" : "en");

    if (!plan) return <div className="p-10 text-center">Initializing AI...</div>;

    // Calculate effective rain probability for display
    const currentRainProb = Math.max(0, Math.min(100, MOCK_WEATHER_DATA[0].rain_probability + simulation.rain));

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-slate-950 border-b border-indigo-100 dark:border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-80">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                            <Droplet className="w-5 h-5 fill-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                                {lang === "en" ? "Smart Irrigation" : "ஸ்மார்ட் பாசனம்"}
                            </h1>
                            <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">AI Agent Powered</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status Indicator */}
                        <div className={cn("hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border",
                            iotState?.lastUpdated ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200")}>
                            <div className={cn("w-2 h-2 rounded-full", iotState?.lastUpdated ? "bg-green-500 animate-pulse" : "bg-slate-400")} />
                            {iotState?.lastUpdated ? "System Online" : "Waiting for ESP32..."}
                        </div>

                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-xs font-semibold hover:bg-slate-200 transition-colors"
                        >
                            <Globe className="w-3.5 h-3.5" />
                            {lang === "en" ? "English" : "தமிழ்"}
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                {/* IoT Live Status Card */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Live Sensor Data */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Live Soil Moisture</p>
                            <h3 className="text-2xl font-bold font-mono">
                                {iotState?.soilMoisturePercent ?? "--"}%
                            </h3>
                            <p className="text-[10px] text-slate-400">
                                Raw: {iotState?.soilMoistureRaw ?? 0}
                            </p>
                        </div>
                    </div>

                    {/* Pump Status */}
                    <div className={cn("p-5 rounded-xl shadow-sm border flex items-center gap-4 transition-colors",
                        iotState?.pumpState === "ON" ? "bg-green-50 border-green-200" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800")}>
                        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all",
                            iotState?.pumpState === "ON" ? "bg-green-500 text-white shadow-lg shadow-green-500/30" : "bg-slate-100 text-slate-400")}>
                            <Power className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Pump Status</p>
                            <h3 className={cn("text-2xl font-bold font-mono", iotState?.pumpState === "ON" ? "text-green-700" : "text-slate-700")}>
                                {iotState?.pumpState ?? "OFF"}
                            </h3>
                            <p className="text-[10px] text-slate-400">
                                {isManual ? "Manual Override" : "AI Controlled"}
                            </p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-center gap-2">
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Manual Override</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleManualControl("ON")}
                                className={cn("flex-1 py-2 text-xs font-bold rounded-lg border transition-all",
                                    iotState?.pumpState === "ON" && isManual
                                        ? "bg-green-600 text-white border-green-600 shadow-md"
                                        : "bg-white hover:bg-green-50 text-green-700 border-green-200")}
                            >
                                START
                            </button>
                            <button
                                onClick={() => handleManualControl("OFF")}
                                className={cn("flex-1 py-2 text-xs font-bold rounded-lg border transition-all",
                                    iotState?.pumpState === "OFF" && isManual
                                        ? "bg-red-600 text-white border-red-600 shadow-md"
                                        : "bg-white hover:bg-red-50 text-red-700 border-red-200")}
                            >
                                STOP
                            </button>
                            <button
                                onClick={() => handleManualControl("AUTO")}
                                className={cn("px-3 py-2 text-xs font-bold rounded-lg border transition-all",
                                    !isManual
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                                        : "bg-white hover:bg-indigo-50 text-indigo-700 border-indigo-200")}
                                title="Resume AI Mode"
                            >
                                <Cpu className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Simulation Controls (Demo only) */}
                <section className="bg-gradient-to-r from-slate-900 to-indigo-900 text-indigo-50 p-4 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-indigo-300" />
                                {lang === 'en' ? "Planning Simulator" : "திட்டமிடல் உருவகப்படுத்துதல்"}
                            </h3>
                            <p className="text-indigo-200 text-sm mt-0.5">Simulate future scenarios (does not affect live pump).</p>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs uppercase font-bold text-indigo-300">Moisture Offset</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range" min="-30" max="40" value={simulation.soil}
                                        onChange={(e) => setSimulation(s => ({ ...s, soil: parseInt(e.target.value) }))}
                                        className="accent-indigo-300 cursor-pointer"
                                    />
                                    <span className="text-xs font-mono w-8 text-right">{simulation.soil > 0 ? '+' : ''}{simulation.soil}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs uppercase font-bold text-indigo-300">Rain Prob Offset</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range" min="-80" max="20" value={simulation.rain}
                                        onChange={(e) => setSimulation(s => ({ ...s, rain: parseInt(e.target.value) }))}
                                        className="accent-indigo-300 cursor-pointer"
                                    />
                                    <span className="text-xs font-mono w-8 text-right">{simulation.rain > 0 ? '+' : ''}{simulation.rain}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Rain Alert System */}
                <RainAlert probability={currentRainProb} />

                {/* Thinking Trace */}
                {plan && <ThinkingTrace trace={plan.reasoning_trace} />}

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {plan && <DailySchedule plan={plan} />}
                        <ImpactReport data={impactData} />
                    </div>
                    <div className="lg:col-span-1 space-y-8">
                        <SettingsForm settings={settings} onSettingsChange={setSettings} />

                        {/* Micro Weather Card - Real Data if available in plan */}
                        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <p className="text-sky-100 text-sm font-medium mb-1">{plan?.weather_summary ? "Live Forecast" : "Forecasting..."}</p>
                                    <h3 className="text-3xl font-bold">{plan?.weather_summary.split(',')[0] || "--°C"}</h3>
                                    <p className="text-sm opacity-80 mt-1">{plan?.weather_summary.split(',')[1] || ""}</p>
                                </div>
                                <Sun className="w-10 h-10 text-yellow-300 animate-pulse" />
                            </div>
                            <div className="flex gap-4 text-sm font-medium text-sky-100">
                                <div className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                    Humidity: 65%
                                </div>
                                <div className="bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                    Wind: 12 km/h
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
