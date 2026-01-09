// lib/thingsboard.ts

// Configuration
// In production, use process.env.THINGSBOARD_HOST etc.
const TB_HOST = "https://demo.thingsboard.io"; // Default demo server
const TB_DEVICE_ID = "YOUR_DEVICE_ID"; // The UUID of the device in ThingsBoard
const TB_JWT_TOKEN = "YOUR_USER_JWT_TOKEN"; // JWT for REST API access (if needed for non-public)
// OR for simple public dashboard access / device token access:

// Actually, the server (Next.js) acts as a "User" looking at the device, or acts as the Device?
// The REQUEST says: "AI to fetch the data from the cloud".
// So Next.js needs to fetch telemetry FROM ThingsBoard.
// To do that, we need the Device ID and a User/Customer Token that has access to that device.

// For simplicity in this hackathon context, we'll assume we can use the public /api/plugins/telemetry endpoints
// if we have the entityId.

interface ThingsBoardTelemetry {
    soilMoisture: number;         // Key: 'soil_moisture'
    pumpStatus: "ON" | "OFF";     // Key: 'pump_state'
}

export async function fetchThingsBoardTelemetry(deviceId: string, token: string): Promise<ThingsBoardTelemetry> {
    try {
        // API: GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=soil_moisture,pump_state
        // Note: This requires a JWT token in Header "X-Authorization: Bearer ..."

        // Mocking the call for now as we don't have a real JWT.
        // In a real app, we'd login first: POST /api/auth/login

        console.log(`[ThingsBoard] Fetching for ${deviceId}...`);

        // Simulate fetch delay
        await new Promise(r => setTimeout(r, 500));

        // Return mock data for now until user provides credentials
        return {
            soilMoisture: 45,
            pumpStatus: "OFF"
        };

    } catch (e) {
        console.error("TB Fetch Error", e);
        return { soilMoisture: 0, pumpStatus: "OFF" };
    }
}

// Function to send RPC Command from Cloud to Device via ThingsBoard
export async function sendRpcToDevice(deviceId: string, token: string, method: string, params: any) {
    // POST /api/plugins/rpc/oneway/{deviceId}
    // Body: { "method": "setGpio", "params": { "pin": 1, "value": 1 } }
    console.log(`[ThingsBoard] Sending RPC to ${deviceId}: ${method}`, params);

    // Implementation would go here
    return true;
}
