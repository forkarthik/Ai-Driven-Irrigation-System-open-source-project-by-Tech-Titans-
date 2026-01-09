export default function Footer() {
    return (
        <footer className="mt-12 py-8 border-t border-slate-200 dark:border-slate-800 text-center">
            <div className="max-w-4xl mx-auto px-4 space-y-2">
                <p className="text-xs text-slate-500">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Safety Disclaimer:</span> AI recommendations follow general ICAR/FAO guidelines. Always consult local agricultural experts for chemical/medical prescriptions.
                </p>
                <p className="text-xs text-slate-400">
                    <span className="font-bold">Privacy Mode:</span> Using synthetic sensor data for evaluation. No personal data is stored.
                </p>
            </div>
        </footer>
    );
}
