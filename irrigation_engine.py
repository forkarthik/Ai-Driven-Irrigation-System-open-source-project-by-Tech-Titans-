import datetime
from typing import List, Dict, Any, Optional

# Constants
BASE_ET0 = 6.5  # mm/day

MOCK_WEATHER_DATA = [
    {"date": "2025-12-29", "rain_probability": 85, "temperature": 24, "wind_speed": 12},
    {"date": "2025-12-30", "rain_probability": 40, "temperature": 26, "wind_speed": 8},
    {"date": "2025-12-31", "rain_probability": 10, "temperature": 28, "wind_speed": 5},
    {"date": "2026-01-01", "rain_probability": 5, "temperature": 29, "wind_speed": 6},
    {"date": "2026-01-02", "rain_probability": 0, "temperature": 30, "wind_speed": 7},
    {"date": "2026-01-03", "rain_probability": 15, "temperature": 27, "wind_speed": 9},
    {"date": "2026-01-04", "rain_probability": 20, "temperature": 26, "wind_speed": 10},
]

MOCK_SOIL_DATA = [
    {"timestamp": "2025-12-29T08:00:00", "moisture_level_percentage": 30, "sensor_id": "S-001"}
]

CROP_COEFFICIENTS = {
    "Rice (Paddy)": {"Vegetative": 1.1, "Reproductive": 1.25, "Ripening": 1.0},
    "Wheat": {"Vegetative": 0.7, "Reproductive": 1.15, "Ripening": 0.4},
    "Sugarcane": {"Vegetative": 0.8, "Reproductive": 1.25, "Ripening": 0.7},
    "Cotton": {"Vegetative": 0.35, "Reproductive": 1.2, "Ripening": 0.6},
}

def generate_daily_plan(
    soil_correction: int = 0,
    rain_correction: int = 0,
    crop_type: str = "Rice (Paddy)",
    growth_stage: str = "Vegetative",
    field_size: float = 1.5
) -> Dict[str, Any]:
    
    current_soil = max(0, min(100, MOCK_SOIL_DATA[0]["moisture_level_percentage"] + soil_correction))
    today_weather = MOCK_WEATHER_DATA[0].copy()
    today_weather["rain_probability"] = max(0, min(100, today_weather["rain_probability"] + rain_correction))
    
    trace = []
    step = 1
    
    # --- Step 1: Crop Needs ---
    kc = CROP_COEFFICIENTS.get(crop_type, {}).get(growth_stage, 1.0)
    water_demand_mm = BASE_ET0 * kc
    
    trace.append({
        "step": step,
        "description": "Assess Crop Needs",
        "result": "SAFE",
        "details": f"{crop_type} in {growth_stage} stage (Kc: {kc}). Daily demand: {water_demand_mm:.2f} mm."
    })
    step += 1
    
    # --- Step 2: Soil Moisture ---
    soil_status = "Observed"
    soil_factor = 0.0
    
    if current_soil < 40:
        soil_status = "Dry"
        soil_factor = 0.0
        trace.append({
            "step": step,
            "description": "Analyze Soil Moisture",
            "result": "WATER",
            "details": f"Moisture is {current_soil}% (< 40%). Soil is dry, strict irrigation needed."
        })
    elif current_soil > 80:
        soil_status = "Wet"
        soil_factor = 1.0
        trace.append({
            "step": step,
            "description": "Analyze Soil Moisture",
            "result": "SKIP",
            "details": f"Moisture is {current_soil}% (> 80%). Soil is saturated, no irrigation needed."
        })
    else:
        soil_status = "Optimal"
        soil_factor = (current_soil - 40) / 40.0
        trace.append({
            "step": step,
            "description": "Analyze Soil Moisture",
            "result": "SAFE",
            "details": f"Moisture is {current_soil}% (Optimal). Available water factor: {soil_factor:.2f}."
        })
    step += 1
    
    # --- Step 3: Weather ---
    expected_rain_mm = (today_weather["rain_probability"] / 100.0) * 15.0
    
    if today_weather["rain_probability"] > 60:
        trace.append({
            "step": step,
            "description": "Check Weather Forecast",
            "result": "SKIP",
            "details": f"High rain chance ({today_weather['rain_probability']}%). Expected: ~{expected_rain_mm:.1f}mm."
        })
    elif today_weather["rain_probability"] > 20:
        trace.append({
            "step": step,
            "description": "Check Weather Forecast",
            "result": "WARNING",
            "details": f"Moderate rain ({today_weather['rain_probability']}%). Expected: ~{expected_rain_mm:.1f}mm."
        })
    else:
        trace.append({
            "step": step,
            "description": "Check Weather Forecast",
            "result": "SAFE",
            "details": f"Low rain probability ({today_weather['rain_probability']}%). Assuming negligible rainfall."
        })
    step += 1
    
    # --- Final Calculation ---
    required_mm = water_demand_mm * (1 - (soil_factor * 0.8))
    required_mm -= expected_rain_mm
    required_mm = max(0, required_mm)
    
    amount_liters_per_ha = round(required_mm * 10000)
    
    # Fixed schedule baseline provided for comparison
    fixed_schedule_mm = 7 * kc
    fixed_liters_per_ha = round(fixed_schedule_mm * 10000)
    
    final_action = "Monitor"
    if required_mm < 1:
        final_action = "Skip"
        amount_liters_per_ha = 0
    elif required_mm < 3:
        final_action = "Monitor"
        amount_liters_per_ha = 0
    else:
        final_action = "Irrigate"
        
    if soil_status == "Wet":
        final_action = "Skip"
        amount_liters_per_ha = 0
        
    total_amount = amount_liters_per_ha * field_size
    fixed_total = fixed_liters_per_ha * field_size
    savings = max(0, fixed_total - total_amount)
    
    trace.append({
        "step": step,
        "description": "Final Calculation",
        "result": "WATER" if final_action == "Irrigate" else "SKIP",
        "details": f"Net Needs: {required_mm:.2f}mm. Action: {final_action}. Total Volume: {total_amount:,.0f} L."
    })
    
    return {
        "date": today_weather["date"],
        "time": "06:00 AM",
        "action": final_action,
        "amount_liters_per_hectare": amount_liters_per_ha,
        "total_amount_liters": total_amount,
        "reasoning_trace": trace,
        "savings_vs_fixed": savings,
        "weather_summary": f"{today_weather['temperature']}°C, {today_weather['rain_probability']}% Rain",
        "soil_status": f"{current_soil}% Moisture",
        "crop_stage_name": growth_stage
    }

def generate_weekly_impact(
    soil_correction: int,
    rain_correction: int,
    crop_type: str,
    growth_stage: str,
    field_size: float
) -> List[Dict[str, Any]]:
    
    data = []
    
    for i in range(7):
        day_weather = MOCK_WEATHER_DATA[i] if i < len(MOCK_WEATHER_DATA) else MOCK_WEATHER_DATA[0]
        
        current_rain_prob = max(0, min(100, day_weather["rain_probability"] + rain_correction))
        
        kc = CROP_COEFFICIENTS.get(crop_type, {}).get(growth_stage, 1.0)
        demand = BASE_ET0 * kc
        expected_rain = (current_rain_prob / 100.0) * 15.0
        
        ai_need = demand - expected_rain
        
        # Vary soil moisture for simulation
        random_soil = 40 + (i * 5) % 40
        soil_factor = max(0, (random_soil - 40) / 40.0)
        
        ai_need = ai_need * (1 - (soil_factor * 0.7))
        ai_need = max(0, ai_need)
        
        fixed_need = demand
        
        day_name = datetime.datetime.strptime(day_weather["date"], "%Y-%m-%d").strftime("%a")
        
        data.append({
            "name": day_name,
            "fixed": round(fixed_need * 10000 * field_size),
            "ai": round(ai_need * 10000 * field_size)
        })
        
    return data
