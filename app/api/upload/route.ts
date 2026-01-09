import { NextResponse } from 'next/server';
import { updateTelemetry, getSystemState } from '@/lib/store';
import { runIrrigationLogic } from '@/lib/irrigation-engine';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Expecting: { "soil_moisture": 1234 }
        if (body.soil_moisture !== undefined) {
            updateTelemetry(body.soil_moisture);

            // Trigger AI logic immediately on new data? 
            // Or just let the scheduler handle it?
            // For real-time responsiveness, let's run a quick check.
            await runIrrigationLogic();

            return NextResponse.json({ status: 'success', received: body });
        }

        return NextResponse.json({ status: 'error', message: 'Missing soil_moisture' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ status: 'error', message: 'Invalid JSON' }, { status: 400 });
    }
}
