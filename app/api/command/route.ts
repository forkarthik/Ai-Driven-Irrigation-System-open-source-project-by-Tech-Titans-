import { NextResponse } from 'next/server';
import { getSystemState, setPumpState, clearOverride } from '@/lib/store';

// This endpoint is polled by the ESP32
export async function GET() {
    const state = getSystemState();

    // Simple plain text response for ESP32
    // We return just the command "ON" or "OFF" or a simple JSON if the C++ code can parse it.
    // The provided C++ code checks `response.indexOf("ON") > 0`.
    // So returning JSON like { "command": "ON" } works perfectly.

    return new NextResponse(JSON.stringify({
        command: state.pumpState,
        manual: state.manualOverride,
        timestamp: new Date().toISOString()
    }), {
        status: 200,
    });
}

// Dashboard uses this to toggle pump manually
export async function POST(request: Request) {
    try {
        const body = await request.json();

        // { "action": "ON" | "OFF" | "AUTO" }
        if (body.action === "AUTO") {
            clearOverride();
            return NextResponse.json({ status: "success", mode: "AUTO" });
        }

        if (body.action === "ON" || body.action === "OFF") {
            setPumpState(body.action, true);
            return NextResponse.json({ status: "success", mode: "MANUAL", state: body.action });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (e) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
