/*
 * Smart Irrigation ESP32 Firmware v2.0
 * Features: Cloud Priority Control (Manual Override), Auto-Calibration, Telemetry
 */
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define SOIL_PIN 34
#define RELAY_PIN 5

// --- WIFI & CLOUD CONFIG ---
const char* WIFI_SSID = "Oneplus2";         // <--- UPDATE THIS
const char* WIFI_PASS = "12345678";     // <--- UPDATE THIS
const char* TB_SERVER = "http://demo.thingsboard.io"; 
const char* TB_TOKEN  = "yktlt9lpxdqchp2dkfrd";      

LiquidCrystal_I2C lcd(0x27, 16, 2); // I2C address 0x27, 16x2 LCD

int soilMin = 4095; // wettest observed
int soilMax = 0;     // driest observed

void setup() {
  Serial.begin(115200);
  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Smart Irrigation");
  lcd.setCursor(0, 1);
  lcd.print("System Starting...");
  delay(2000);
  
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // start with relay off
  
  // --- ADDED: WiFi Setup ---
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected");
  lcd.setCursor(0, 1);
  lcd.print("WiFi Online     ");
  delay(1000);
  lcd.clear();
}

void loop() {
  // --- ADDED: Reconnect if lost ---
  if (WiFi.status() != WL_CONNECTED) WiFi.reconnect();

  int rawSoil = analogRead(SOIL_PIN);

  // Dynamic auto-calibration
  if (rawSoil < soilMin) soilMin = rawSoil;
  if (rawSoil > soilMax) soilMax = rawSoil;

  int soilPercent = 0;
  if (soilMax != soilMin) {
    soilPercent = map(rawSoil, soilMax, soilMin, 0, 100);
    soilPercent = constrain(soilPercent, 0, 100);
  }

  // --- PRIORITY 1: Cloud Command (AI/Manual) ---
  bool cloudControl = false;
  
  if (WiFi.status() == WL_CONNECTED) {
     HTTPClient http;
     // Poll for 'pump_decision' attribute
     String attrUrl = String(TB_SERVER) + "/api/v1/" + String(TB_TOKEN) + "/attributes?clientKeys=pump_decision";
     http.begin(attrUrl);
     int httpCode = http.GET();
     
     if (httpCode == 200) {
        String response = http.getString();
        
        // Debug Log
        Serial.println("Rx Attr: " + response);

        // Check if decision is PUMP_ON
        if (response.indexOf("PUMP_ON") != -1) {
           digitalWrite(RELAY_PIN, HIGH);
           Serial.println("cmd: ON");
           lcd.setCursor(0, 1); lcd.print("Pump: ON (Cloud)");
           cloudControl = true;
        } 
        else if (response.indexOf("PUMP_OFF") != -1) {
           digitalWrite(RELAY_PIN, LOW);
           Serial.println("cmd: OFF");
           lcd.setCursor(0, 1); lcd.print("Pump: OFF (Cloud)");
           cloudControl = true;
        }
     } else {
        Serial.print("Attr fetch failed: ");
        Serial.println(httpCode);
     }
     http.end();
     
     // --- Telemetry Upload (Keep Alive) ---
     String teleUrl = String(TB_SERVER) + "/api/v1/" + String(TB_TOKEN) + "/telemetry";
     http.begin(teleUrl);
     http.addHeader("Content-Type", "application/json");
     String realState = (digitalRead(RELAY_PIN) == HIGH) ? "ON" : "OFF";
     String payload = "{\"moisture_raw\":" + String(rawSoil) + 
                      ", \"soil_moisture\":" + String(soilPercent) + 
                      ", \"pump_state\":\"" + realState + "\"}";
     http.POST(payload);
     http.end();
     
     // Sync Attribute for Agent (AND Dashboard Status)
     String syncUrl = String(TB_SERVER) + "/api/v1/" + String(TB_TOKEN) + "/attributes";
     http.begin(syncUrl);
     http.addHeader("Content-Type", "application/json");
     // Fix: Send pump_state here so Dashboard sees it!
     String attrPayload = "{\"current_moisture\":" + String(soilPercent) + 
                          ", \"pump_state\":\"" + realState + "\"}";
     http.POST(attrPayload);
     http.end();
  }

  // --- PRIORITY 2: Local Fallback (If Cloud Fails) ---
  if (!cloudControl) {
    if (soilPercent < 35) {
      digitalWrite(RELAY_PIN, HIGH);
      lcd.setCursor(0, 1); lcd.print("Pump: ON (Local)");
    } else {
      digitalWrite(RELAY_PIN, LOW);
      lcd.setCursor(0, 1); lcd.print("Pump: OFF (Local)");
    }
  }

  // Display Moisture
  lcd.setCursor(0, 0);
  lcd.print("Moisture: ");
  lcd.print(soilPercent);
  lcd.print("%   "); // clear trailing chars

  delay(2000); // Loop interval
}
