
// lib/weather-service.ts

interface WeatherData {
    temperature: number;
    rain_probability: number; // 0-100
    wind_speed: number;
    is_raining: boolean; // based on current code
}

// Open-Meteo Free API
// https://open-meteo.com/
const BASE_URL = "https://api.open-meteo.com/v1/forecast";

export async function getCurrentWeather(lat: number = 28.61, lon: number = 77.20): Promise<WeatherData> {
    // Default to New Delhi (28.61, 77.20) for demo, or user location if provided

    try {
        const params = new URLSearchParams({
            latitude: lat.toString(),
            longitude: lon.toString(),
            current: "temperature_2m,precipitation,rain,weather_code,wind_speed_10m",
            hourly: "precipitation_probability,weather_code",
            forecast_days: "1"
        });

        const res = await fetch(`${BASE_URL}?${params.toString()}`);
        if (!res.ok) throw new Error("Weather API failed");

        const data = await res.json();

        // Map WMO Weather Codes to simple boolean
        // 51, 53, 55, 61, 63, 65, 80, 81, 82 are rain
        const code = data.current.weather_code;
        const isRaining = [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);

        // Get max rain prob for next 24h as general "rain probability" for day
        const probs = data.hourly.precipitation_probability || [];
        const maxProb = Math.max(...(probs as number[]));

        return {
            temperature: data.current.temperature_2m,
            rain_probability: maxProb,
            wind_speed: data.current.wind_speed_10m,
            is_raining: isRaining
        };

    } catch (error) {
        console.error("Weather fetch error:", error);
        // Fallback if API fails
        return {
            temperature: 25,
            rain_probability: 0,
            wind_speed: 5,
            is_raining: false
        };
    }
}
