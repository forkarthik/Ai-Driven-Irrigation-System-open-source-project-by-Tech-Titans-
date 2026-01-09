"use client";

import { DailyPlan } from "@/lib/irrigation-engine";
import { Download, Droplets, Clock, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button"; // Assuming standard shadcn button exists or we style standard button

export default function DailySchedule({ plan }: { plan: DailyPlan }) {
    return (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" />
                        Daily Schedule
                    </h2>
                    <p className="text-slate-500 text-sm">Target: {plan.date}</p>
                </div>
                <button className="flex items-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors font-medium border border-indigo-200">
                    <Download className="w-4 h-4" />
                    Export Plan
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100">
                        <tr>
                            <th className="py-3 px-4 font-semibold">Time Phase</th>
                            <th className="py-3 px-4 font-semibold">Action</th>
                            <th className="py-3 px-4 font-semibold">Amount</th>
                            <th className="py-3 px-4 font-semibold">Stage</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4 font-medium text-slate-900 dark:text-white">Morning (06:00 AM)</td>
                            <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                    ${plan.action === 'Irrigate' ? 'bg-blue-100 text-blue-700' :
                                        plan.action === 'Skip' ? 'bg-amber-100 text-amber-700' :
                                            'bg-slate-100 text-slate-700'}`}>
                                    {plan.action === 'Irrigate' && <Droplets className="w-3 h-3" />}
                                    {plan.action}
                                </span>
                            </td>
                            <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                                {plan.amount_liters_per_hectare > 0 ? (
                                    <div className="flex flex-col">
                                        <span className="font-mono font-medium">{plan.amount_liters_per_hectare.toLocaleString()} L/ha</span>
                                        <span className="text-[10px] text-slate-400">Total: {plan.total_amount_liters.toLocaleString()} L</span>
                                    </div>
                                ) : (
                                    <span className="text-slate-400">-</span>
                                )}
                            </td>
                            <td className="py-4 px-4">
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                    <Sprout className="w-4 h-4 text-green-600" />
                                    {plan.crop_stage_name}
                                </div>
                            </td>
                            <td className="py-4 px-4">
                                <span className="text-slate-500">{plan.soil_status}</span>
                            </td>
                        </tr>
                        {/* Simple visual placeholders for other times if needed, or keep it single daily summary as per requirements */}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500 text-sm">Estimated Cost Impact</span>
                <span className="font-semibold text-emerald-600 text-sm">
                    Savings: {plan.savings_vs_fixed.toLocaleString()} L
                </span>
            </div>
        </div>
    );
}
