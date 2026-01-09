"use client";

import { Settings2 } from "lucide-react";

export type IrrigationSettings = {
    cropType: string;
    growthStage: string;
    fieldSize: number;
};

interface SettingsFormProps {
    settings: IrrigationSettings;
    onSettingsChange: (settings: IrrigationSettings) => void;
}

export default function SettingsForm({ settings, onSettingsChange }: SettingsFormProps) {

    const handleChange = (field: keyof IrrigationSettings, value: string | number) => {
        onSettingsChange({
            ...settings,
            [field]: value
        });
    };

    return (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 text-slate-800 dark:text-slate-200">
                <Settings2 className="w-5 h-5 text-slate-400" />
                <h2 className="font-bold">Field Configuration</h2>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Crop Type</label>
                    <select
                        value={settings.cropType}
                        onChange={(e) => handleChange("cropType", e.target.value)}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option>Rice (Paddy)</option>
                        <option>Wheat</option>
                        <option>Sugarcane</option>
                        <option>Cotton</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Growth Stage</label>
                    <select
                        value={settings.growthStage}
                        onChange={(e) => handleChange("growthStage", e.target.value)}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    >
                        <option>Vegetative</option>
                        <option>Reproductive</option>
                        <option>Ripening</option>
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1.5">Field Size (Hectares)</label>
                    <div className="relative">
                        <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={settings.fieldSize}
                            onChange={(e) => handleChange("fieldSize", parseFloat(e.target.value) || 0)}
                            className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="text-xs text-slate-400 text-center mt-2">
                    Auto-saved
                </div>
            </div>
        </div>
    );
}
