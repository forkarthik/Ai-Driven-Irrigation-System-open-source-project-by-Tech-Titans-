# Smart Irrigation System - Step-by-Step Run Guide

Follow these steps to run the complete end-to-end system.

## 1. Start the Live Dashboard (Streamlit)
The project now runs on a custom **Streamlit Dashboard** for richer control.
```powershell
streamlit run iot_dashboard.py
```
*   **What you see**: A beautiful interface with Live Moisture, AI Decisions, Weather, and **Manual Override** buttons.
*   **Action**: Keep this terminal open.

## 2. Start the AI Agent (The Brain)
Open a **new terminal** and run the decision core.
```powershell
python decision_core.py
```
*   **Log**: You should see: `--- Smart Irrigation Agent v2.0 (Manual Ready) ---`.
*   **What it does**:
    1.  Syncs settings (Crop Type, Field Size) from the Dashboard.
    2.  Fetches real-time weather from OpenWeatherMap.
    3.  Analyzes moisture & history to decide `PUMP_ON` or `PUMP_OFF`.
    4.  Respects **Manual Override** if enabled on the Dashboard.

## 3. Flash the ESP32 (The Worker)
1.  Open `firmware/esp32_irrigation.ino` in Arduino IDE.
2.  **Verify Settings**:
    *   SSID: `D_K_`
    *   Password: `12345678`
    *   Token: `yktlt9lpxdqchp2dkfrd`
3.  **Upload**: Connect your ESP32 and click Upload.
4.  **Monitor**: Open Serial Monitor (115200 baud) to see "TB Send" logs.

## 4. Verify Operation (The Loop)
1.  **Dashboard Control**: Change the "Crop Type" in the sidebar. Watch the "Thinking Process" in the Agent terminal update instantly.
2.  **Manual Override**: Click **Pump ON** in the Dashboard.
    *   Agent prints: `MANUAL OVERRIDE: User forced Pump ON`.
    *   ESP32 Relay clicks ON immediately.
3.  **Soil Type**: New in v2.2 - Select your soil (Clay/Loam/Sandy) for better accuracy.
4.  **Real-Time Weather**: Check the top-right of the dashboard for live Temperature & Rain Probability.
5.  **Weekly Impact**: Scroll down to see the "Water Savings" chart, comparing AI vs Timer.
6.  **Instant Control**: The system now checks for commands every **2 seconds**.

## Troubleshooting
*   **"WiFi Not Connected"**: Check credentials in `esp32_irrigation.ino` line 9-10.
*   **"Waiting for data..."**: Ensure `decision_core.py` is running and ESP32 is online.
*   **"Agent not reacting"**: The Agent polls every **5 seconds**. Wait a moment for the cycle to complete.
