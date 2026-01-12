# Smart Irrigation Scheduler and Water Saver 🌾💧

An AI-powered Intelligent Irrigation System designed for the AI Ignite Hackathon. This project uses IoT (ESP32), AI Agents (Python), and Cloud Connectivity (ThingsBoard) to optimize water usage based on real-time soil moisture, crop specific needs, and hyper-local weather forecasts.

## 📚 Architecture & Design
> **[View Detailed Agentic Architecture](./ARCHITECTURE.md)** including 9-Layer Diagram and AI Properties.

## 🚀 Features

*   **AI Decision Agent ("The Brain")**:
    *   Calculates precise water demand using **ET0 (Evapotranspiration)** and **Kc (Crop Coefficients)**.
    *   Supports multiple crops (Rice, Wheat, Sugarcane) and growth stages.
    *   Integrates **OpenWeatherMap API** to prevent irrigation before rain.
*   **IoT Edge Device ("The Worker")**:
    *   **ESP32** microcontroller with **YL-69 Soil Moisture Sensor**.
    *   **LCD Display** (16x2 I2C) for real-time local status.
    *   **Auto-Calibration** logic for the sensor.
    *   **Hybrid Control**: Local relay control + Cloud override.
    *   **Dashboard**:
        *   **Live Streamlit App**: Rich UI with Manual Override & Live Weather.
        *   **Weekly Impact Report**: Visualizes Water Savings vs Standard Timers.
        *   **Ultra-Low Latency**: 2s command sync for instant control.
        *   **Configurable**: Set Crop, Soil Type, and Field Size dynamically.

## 🛠️ Tech Stack

*   **Hardware**: ESP32, YL-69 Sensor, Relay Module, LCD 1602 (I2C), Submersible Pump.
*   **Firmware**: C++ (Arduino Framework).
*   **Backend/Agent**: Python 3.x, `requests` library.
*   **Cloud Platform**: ThingsBoard (Demo/Cloud).
*   **APIs**: OpenWeatherMap.

## 📂 Project Structure

```
water irrigation/
├── firmware/
│   └── esp32_irrigation.ino   # C++ code for ESP32
├── scripts/
│   └── provision_dashboard.py # Python script to auto-setup ThingsBoard
├── decision_core.py           # Main AI Brain (Run this on PC/Server)
├── iot_dashboard.py           # Live Streamlit Dashboard
├── thingsboard_dashboard.json # Dashboard configuration file
├── WALKTHROUGH.md             # Step-by-step Run Guide
└── README.md                  # This file
```

## ⚡ Quick Start

1.  **Flash Firmware**: Upload `firmware/esp32_irrigation.ino` to your ESP32.
2.  **Start Dashboard**: Run `streamlit run iot_dashboard.py` to see the live view.
3.  **Run Brain**: Start the agent with `python decision_core.py`.
4.  **Control**: Use the Dashboard to set Crop Type or Manual Override.

See **[WALKTHROUGH.md](WALKTHROUGH.md)** for detailed step-by-step instructions.

## ⚙️ Configuration

*   **WiFi**: Edit `WIFI_SSID` and `WIFI_PASS` in `esp32_irrigation.ino`.
*   **Weather**: Add your OpenWeatherMap API Key in `decision_core.py`.
*   **Field Settings**: Use the **Dashboard Sidebar** to configure Crop, Soil, and Size instantly.

## 🌐 Live Demo

🚀 **AI-Powered Smart Irrigation Dashboard (Streamlit):**  
https://ai-driven-irrigation-systems.streamlit.app/

---
*Built for AI Ignite Hackathon 2026*
