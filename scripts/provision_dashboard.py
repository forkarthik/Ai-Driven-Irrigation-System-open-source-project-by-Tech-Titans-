import json
import requests
import getpass
import sys

# Default to ThingsBoard Cloud
TB_SERVER_URL = "https://demo.thingsboard.io"

def get_token(username, password):
    url = f"{TB_SERVER_URL}/api/auth/login"
    try:
        response = requests.post(url, json={"username": username, "password": password})
        if response.status_code == 200:
            return response.json()["token"]
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Connection error: {e}")
        return None

def create_dashboard(token, dashboard_json):
    url = f"{TB_SERVER_URL}/api/dashboard"
    headers = {
        "Content-Type": "application/json",
        "X-Authorization": f"Bearer {token}"
    }
    
    try:
        # Wrap the configuration in the required structure for creation
        # The API expects: { "title": "...", "configuration": { ... } }
        # Our JSON file has this structure.
        
        response = requests.post(url, headers=headers, json=dashboard_json)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Dashboard creation failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error creating dashboard: {e}")
        return None

def main():
    print("--- Smart Irrigation Dashboard Provisioner ---")
    print(f"Server: {TB_SERVER_URL}")
    print("Please enter your ThingsBoard User Credentials (email/password).")
    
    username = input("Email: ").strip()
    password = getpass.getpass("Password: ")
    
    if not username or not password:
        print("Credentials required.")
        return

    print("\nAuthenticating...")
    token = get_token(username, password)
    
    if not token:
        sys.exit(1)
        
    print("Authenticated successfully.")
    
    print("Reading dashboard definition...")
    try:
        with open("../thingsboard_dashboard.json", "r") as f:
            dashboard_data = json.load(f)
    except FileNotFoundError:
        print("Error: ../thingsboard_dashboard.json not found. Make sure you are running this from the 'scripts' folder or adjust path.")
        try:
            with open("thingsboard_dashboard.json", "r") as f:
                dashboard_data = json.load(f)
        except:
             sys.exit(1)

    print("Creating Dashboard...")
    result = create_dashboard(token, dashboard_data)
    
    if result:
        dash_id = result["id"]["id"]
        print(f"\nSUCCESS! Dashboard Created.")
        print(f"Dashboard ID: {dash_id}")
        print(f"Link: {TB_SERVER_URL}/dashboards/{dash_id}")
        print("\nNote: You may need to assign your device to this dashboard or edit the widget aliases in the UI to point to your specific device 'Entity Alias'.")
    else:
        print("Failed to create dashboard.")

if __name__ == "__main__":
    main()
