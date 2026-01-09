"use client";

import { IrrigationDecision } from "@/lib/irrigation-engine";
import { ChevronDown, ChevronUp, Cpu, CheckCircle2, AlertTriangle, XCircle, Droplets } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function ThinkingTrace({ trace }: { trace: IrrigationDecision[] }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900/30 rounded-xl shadow-sm overflow-hidden">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between p-4 bg-indigo-50/50 dark:bg-indigo-950/20 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-semibold text-indigo-950 dark:text-indigo-100">AI Reasoning Engine</h3>
                    <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full font-medium">
                        Active
                    </span>
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-indigo-400" />}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="p-4 space-y-4"
                    >
                        {trace.map((step, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="flex gap-3 text-sm"
                            >
                                <div className="mt-0.5 shrink-0">
                                    {step.result === "SAFE" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    {step.result === "WARNING" && <AlertTriangle className="w-5 h-5 text-amber-500" />}
                                    {step.result === "SKIP" && <XCircle className="w-5 h-5 text-rose-500" />}
                                    {step.result === "WATER" && <Droplets className="w-5 h-5 text-blue-500" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">{step.description}</span>
                                        <span className={cn(
                                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                                            step.result === "SAFE" ? "bg-emerald-100 text-emerald-700" :
                                                step.result === "SKIP" ? "bg-rose-100 text-rose-700" :
                                                    step.result === "WATER" ? "bg-blue-100 text-blue-700" :
                                                        "bg-amber-100 text-amber-700"
                                        )}>
                                            {step.result}
                                        </span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 mt-1">{step.details}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
