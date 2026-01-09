"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";

export type ImpactData = {
    name: string;
    fixed: number;
    ai: number;
};

export default function ImpactReport({ data }: { data: ImpactData[] }) {
    if (!data || data.length === 0) return null;

    const totalFixed = data.reduce((acc, curr) => acc + curr.fixed, 0);
    const totalAi = data.reduce((acc, curr) => acc + curr.ai, 0);
    const saved = totalFixed - totalAi;

    return (
        <div className="bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-6 h-full">
            <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Weekly Impact Report</h2>
                <p className="text-sm text-slate-500">Water usage: Fixed Schedule vs AI Optimized</p>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: number) => [`${value.toLocaleString()} L`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="fixed" name="Fixed Schedule" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ai" name="AI Smart Water" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Used</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{totalAi.toLocaleString()} L</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Total Saved</p>
                    <p className="text-xl font-bold text-emerald-600">{saved.toLocaleString()} L</p>
                </div>
            </div>
        </div>
    );
}
