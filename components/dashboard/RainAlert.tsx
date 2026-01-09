"use client";

import { CloudRain, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function RainAlert({ probability }: { probability: number }) {
    if (probability <= 60) return null;

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm mb-6"
        >
            <div className="flex items-start gap-3">
                <CloudRain className="w-6 h-6 text-blue-500 mt-0.5" />
                <div>
                    <h3 className="font-bold text-blue-900 dark:text-blue-100">High Rain Probability Detected ({probability}%)</h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                        The AI has paused scheduled irrigation to prevent waterlogging and save resources.
                        Monitoring will resume after the forecast period.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
