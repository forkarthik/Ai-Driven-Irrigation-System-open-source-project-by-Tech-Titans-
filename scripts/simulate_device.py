
import time
import requests
import random
import json

# ThingsBoard Config
TB_HOST = "http://demo.thingsboard.io"
ACCESS_TOKEN = "YOUR_ACCESS_TOKEN" # Replace with yours

TELEMETRY_URL = f"{TB_HOST}/api/v1/{ACCESS_TOKEN}/telemetry"
ATTRIBUTES_URL = f"{TB_HOST}/api/v1/{ACCESS_TOKEN}/attributes?sharedKeys=pump_command"

def simulate_device():
    print(f"🚀 Starting Virtual TB Device...")
    print(f"📡 Connecting to {TB_HOST} with token {ACCESS_TOKEN}")
    
    pump_state = "OFF"
    moisture = 50 
    
    while True:
        # 1. Simulate Moisture
        if pump_state == "ON":
            moisture += 5
        else:
            moisture -= 2
        moisture = max(0, min(100, moisture))
        
        # Raw value
        raw_val = int(4095 - (moisture * 30.95))
        
        # 2. Upload Telemetry
        try:
            payload = {
                "soil_moisture": raw_val,
                "pump_state": pump_state
            }
            print(f"📤 Sending {payload}...", end="")
            res = requests.post(TELEMETRY_URL, json=payload)
            if res.status_code == 200:
                print(" ✅")
            else:
                print(f" ❌ {res.status_code}")
        except Exception as e:
            print(f"Error: {e}")

        # 3. Check Commands (Attributes)
        try:
            res = requests.get(ATTRIBUTES_URL)
            if res.status_code == 200:
                data = res.json()
                # {"shared":{"pump_command":"ON"}}
                if "shared" in data and "pump_command" in data["shared"]:
                    cmd = data["shared"]["pump_command"]
                    if cmd != pump_state:
                         print(f"🔄 Command Received: {cmd}")
                         pump_state = cmd
        except:
            pass
            
        time.sleep(5)

if __name__ == "__main__":
    simulate_device()
