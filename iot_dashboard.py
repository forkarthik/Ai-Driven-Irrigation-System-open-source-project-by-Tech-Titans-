import json
import time
import random
from datetime import datetime
from typing import Dict, Any, List

# --- Configuration & Constants ---
# TODO: USER to update these values
THINGSBOARD_SERVER = "http://demo.thingsboard.io"
THINGSBOARD_ACCESS_TOKEN = "yktlt9lpxdqchp2dkfrd"
OPENWEATHER_API_KEY = "YOUR_OPENWEATHER_API_KEY_HERE"
OPENWEATHER_CITY = "Coimbatore,IN" # Example

# Irrigation Constants & Configuration
# Default Fallbacks
DEFAULT_CROP_TYPE = "Rice (Paddy)"
DEFAULT_GROWTH_STAGE = "Vegetative"
DEFAULT_FIELD_SIZE_HA = 1.5

BASE_ET0 = 6.5  # mm/day Reference Evapotranspiration

CROP_COEFFICIENTS = {
    "Rice (Paddy)": {"Vegetative": 1.1, "Reproductive": 1.25, "Ripening": 1.0},
    "Wheat": {"Vegetative": 0.7, "Reproductive": 1.15, "Ripening": 0.4},
    "Sugarcane": {"Vegetative": 0.8, "Reproductive": 1.25, "Ripening": 0.7},
    "Cotton": {"Vegetative": 0.35, "Reproductive": 1.2, "Ripening": 0.6},
}

class SmartIrrigationAgent:
    def __init__(self):
        self.history = []
        # Initial defaults
        self.crop_type = DEFAULT_CROP_TYPE
        self.growth_stage = DEFAULT_GROWTH_STAGE
        self.field_size = DEFAULT_FIELD_SIZE_HA


    def calibrate_moisture(self, raw_value: int, soil_type: str = "loam") -> float:
        """
        Calibrates raw sensor range (usually 0-4095 or similar inverse mapping) to 0-100%.
        Assumes YL-69: High value = Dry, Low value = Wet.
        """
        # Example calibration for ESP32 12-bit ADC (inverted)
        # Air (Dry) ~ 3500-4095 -> 0%
        # Water (Wet) ~ 1000-1500 -> 100%
        
        # MOCK logic for this standalone script if raw is passed as simplified 0-100 already
        # If raw is actual ADC, we'd map it.
        # Assuming input here is already somewhat normalized for the sake of this agent logic, 
        # or we apply a linear map. Let's assume input is 0-100 for simplicity in this logic core
        # unless raw is specified.
        
        # If we act as a "pass-through" mostly:
        return max(0.0, min(100.0, float(raw_value)))

    def get_weather_forecast(self) -> Dict[str, Any]:
        """
        Fetches weather data from OpenWeatherMap API.
        Falls back to mock data if API key is not set or request fails.
        """
        if "YOUR_" in OPENWEATHER_API_KEY:
            # Fallback to mock if key is not set
            return self._get_mock_weather()

        url = f"http://api.openweathermap.org/data/2.5/weather?q={OPENWEATHER_CITY}&appid={OPENWEATHER_API_KEY}&units=metric"
        
        try:
            import requests
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return {
                    "temperature": data["main"]["temp"],
                    "humidity": data["main"]["humidity"],
                    "rain_probability": 0 if "rain" not in data else 90, # Simplified logic as current weather API doesn't give probability easily without "One Call"
                    "rain_forecast_24h": 0.0 # Standard API doesn't allow easy forecast, keeping 0 for safety in free tier standard call
                }
            else:
                print(f"Weather API Error: {response.status_code}")
                return self._get_mock_weather()
        except Exception as e:
            print(f"Weather Fetch Failed: {e}")
            return self._get_mock_weather()

    def _get_mock_weather(self):
        return {
            "temperature": 28.5,
            "humidity": 65,
            "rain_probability": 10, 
            "rain_forecast_24h": 0.0
        }

    def fetch_attributes(self):
        """
        Fetches moisture, config, AND manual override status.
        """
        keys = "current_moisture,config_crop_type,config_growth_stage,config_field_size,manual_override,manual_state,config_soil_type"
        url = f"{THINGSBOARD_SERVER}/api/v1/{THINGSBOARD_ACCESS_TOKEN}/attributes?clientKeys={keys}"
        try:
            import requests
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                client_data = data.get("client", {})
                
                # Debug: Print everything we got
                print(f" [Debug] Raw Attributes: {client_data}")

                # ... (Manual Override Check) ...
                self.manual_mode = False
                self.manual_cmd = "OFF"
                
                mo_val = client_data.get("manual_override", False)
                if str(mo_val).lower() == "true":
                     self.manual_mode = True
                elif isinstance(mo_val, bool) and mo_val:
                     self.manual_mode = True
                     
                if self.manual_mode:
                     self.manual_cmd = client_data.get("manual_state", "OFF")
                     print(f" [Debug] Manual Mode DETECTED! Cmd: {self.manual_cmd}")
                
                # specific moisture
                moisture = None
                if "current_moisture" in client_data:
                    moisture = float(client_data["current_moisture"])
                    
                # Update Config if changed
                if "config_crop_type" in client_data:
                    self.crop_type = client_data["config_crop_type"]
                if "config_growth_stage" in client_data:
                    self.growth_stage = client_data["config_growth_stage"]
                if "config_field_size" in client_data:
                    self.field_size = float(client_data["config_field_size"])
                # New: Soil Type
                self.soil_type = client_data.get("config_soil_type", "Loam (Balanced)")
                    
                return moisture
            else:
                return None
        except Exception as e:
            print(f" ! Fetch Connection Error: {e}")
            return None

    def analyze_and_decide(self, current_moisture: float) -> Dict[str, Any]:
        # Always fetch weather for Dashboard visibility
        weather = self.get_weather_forecast()
        
        # --- PRIORITY 1: Manual Override ---
        if getattr(self, 'manual_mode', False):
             decision = "PUMP_" + self.manual_cmd
             return {
                "decision": decision,
                "duration_seconds": 60, 
                "reason": f"MANUAL OVERRIDE: User forced Pump {self.manual_cmd}",
                "soil_moisture_percent": current_moisture,
                "weather_summary": weather,
                "alerts": ["⚠️ Manual Control Active"],
                "timestamp": datetime.now().isoformat(),
                "liters_for_field": 0
             }

        # Initialize Defaults
        decision = "PUMP_OFF"
        duration = 0
        reason = "Monitoring..."
        alerts = []
        
        # Recalculate Kc based on dynamic settings
        kc = CROP_COEFFICIENTS.get(self.crop_type, {}).get(self.growth_stage, 1.0)
        water_demand_mm = BASE_ET0 * kc
        soil_factor = max(0.0, min(1.0, (current_moisture - 40) / 40.0))
        expected_rain_mm = (weather["rain_probability"] / 100.0) * 15.0
        net_demand_mm = max(0.0, water_demand_mm * (1 - (soil_factor * 0.8)) - expected_rain_mm)
        liters_needed = round(net_demand_mm * 10000 * self.field_size) 

        print(f" [Calc] Moisture: {current_moisture}% | Rain Prob: {weather['rain_probability']}% | Demand: {net_demand_mm:.2f}mm")

        # --- PRIORITY 2: Rain Lockout ---
        # If High Rain Chance (>60%), STOP everything (unless manual).
        if weather['rain_probability'] > 60:
             decision = "PUMP_OFF"
             reason = f"Rain likely ({weather['rain_probability']}%). Skipping irrigation."
        
        # --- PRIORITY 3: Critical Dryness ---
        # If no rain risk, but soil is unbelievably dry (<30%), EMERGENCY WATERING.
        elif current_moisture < 30:
             decision = "PUMP_ON"
             duration = 30 
             reason = f"EMERGENCY: Soil dangerously dry ({current_moisture}%). Forcing irrigation."
             alerts.append("Critical: Soil < 30%")

        # --- PRIORITY 4: Standard AI Logic ---
        # Normal operation range
        elif net_demand_mm > 1.0: 
             decision = "PUMP_ON"
             duration = int(net_demand_mm * 300) 
             reason = f"Need {net_demand_mm:.1f}mm for {self.crop_type}. Input: {liters_needed}L"
        else:
             decision = "PUMP_OFF"
             reason = f"Moisture sufficient ({current_moisture}%). {self.crop_type} is happy."

        # 3. Construct Output
        result = {
            "decision": decision,
            "duration_seconds": duration,
            "reason": reason,
            "soil_moisture_percent": current_moisture,
            "weather_summary": weather,
            "alerts": alerts,
            "timestamp": datetime.now().isoformat(),
            "liters_for_field": liters_needed,
            "config_used": {
                "crop": self.crop_type,
                "stage": self.growth_stage,
                "kc": kc
            }
        }
        
        return result

    def run_forever(self, interval=60):
        print(f"--- Smart Irrigation Agent v2.2 (Low Latency) ---")
        print(f"Starting Poll Loop (Interval: {interval}s)")
        print(f"Press Ctrl+C to stop.")
        
        try:
            while True:
                real_moisture = self.fetch_attributes()
                
                if real_moisture is not None:
                     print(f"\n--- Cycle Start ({datetime.now().strftime('%H:%M:%S')}) ---")
                     # Log all config including new Soil Type
                     print(f"Config: {self.crop_type} | {self.growth_stage} | {self.soil_type} | {self.field_size}ha")
                     print(f"Input Moisture (From Cloud): {real_moisture}%")
                     result = self.analyze_and_decide(real_moisture)
                else:
                    # Fallback
                    import random
                    mock_moisture = random.randint(30, 90)
                    print(f"\n--- Cycle Start (Simulated) ---")
                    print(f"Using Config: {self.crop_type}")
                    result = self.analyze_and_decide(mock_moisture)
                
                self.push_decision_to_thingsboard(result)
                
                print(f"Decision: {result['decision']}")
                if result['decision'] == 'PUMP_ON':
                    print(f"Duration: {result['duration_seconds']}s")
                
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print("\nStopping Agent...")

    def push_decision_to_thingsboard(self, decision_data):
        # Use the new access key in the URL
        url = f"{THINGSBOARD_SERVER}/api/v1/{THINGSBOARD_ACCESS_TOKEN}/attributes"
        
        # Construct rich payload
        payload = {
            "pump_decision": decision_data["decision"],
            "pump_duration": decision_data["duration_seconds"],
            "ai_reason": decision_data["reason"],
            # Flatten weather for direct dashboard access
            "ai_weather_temp": decision_data["weather_summary"]["temperature"],
            "ai_weather_rain": decision_data["weather_summary"]["rain_probability"],
            "last_decision_ts": decision_data["timestamp"],
            # New Water Stats
            "liters_total": decision_data["liters_for_field"],
            "liters_per_ha": int(decision_data["liters_for_field"] / self.field_size) if self.field_size > 0 else 0
        }
        
        try:
            import requests # Import here to ensure it's available
            response = requests.post(url, json=payload)
            if response.status_code == 200:
                print(" > Command & Context sent to Cloud.")
            else:
                print(f" ! Failed to send command: {response.text}")
        except Exception as e:
            print(f" ! Connection Error: {e}")

if __name__ == "__main__":
    agent = SmartIrrigationAgent()
    # Run every 2 seconds for ultra-low latency
    agent.run_forever(interval=2)
