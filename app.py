import streamlit as st
import pandas as pd
import plotly.express as px
from irrigation_engine import generate_daily_plan, generate_weekly_impact

# --- UI Configuration ---
st.set_page_config(
    page_title="Smart Irrigation Scheduler",
    page_icon="💧",
    layout="wide"
)

# --- Session State ---
if 'lang' not in st.session_state:
    st.session_state.lang = 'en'

def toggle_language():
    st.session_state.lang = 'ta' if st.session_state.lang == 'en' else 'en'

# --- Translations ---
strings = {
    'en': {
        'title': "Smart Irrigation Scheduler",
        'subtitle': "AI Agent Powered",
        'sim_controls': "Simulation Controls",
        'moisture_offset': "Moisture Offset",
        'rain_offset': "Rain Prob Offset",
        'field_config': "Field Configuration",
        'crop_type': "Crop Type",
        'growth_stage': "Growth Stage",
        'field_size': "Field Size (Hectares)",
        'current_forecast': "Current Forecast",
        'humidity': "Humidity",
        'wind': "Wind",
        'daily_schedule': "Daily Schedule",
        'weekly_impact': "Weekly Impact Report",
        'trace_title': "Thinking Process (AI Trace)",
        'trace_desc': "See how the agent decided.",
        'sensor_reads': "Adjust sensor readings to test AI reasoning."
    },
    'ta': {
        'title': "ஸ்மார்ட் பாசனம்",
        'subtitle': "AI ஏஜென்ட் மூலம் இயங்குகிறது",
        'sim_controls': "உருவகப்படுத்துதல் கட்டுப்பாடுகள்",
        'moisture_offset': "ஈரப்பதம் மாற்றம்",
        'rain_offset': "மழை வாய்ப்பு மாற்றம்",
        'field_config': "வயல் உள்ளமைவு",
        'crop_type': "பயிர் வகை",
        'growth_stage': "வளர்ச்சி நிலை",
        'field_size': "வயல் அளவு (ஹெக்டேர்)",
        'current_forecast': "தற்போதைய வானிலை",
        'humidity': "ஈரப்பதம்",
        'wind': "காற்று",
        'daily_schedule': "தினசரி அட்டவணை",
        'weekly_impact': "வாராந்திர தாக்கம்",
        'trace_title': "சிந்தனை செயல்முறை",
        'trace_desc': "AI எப்படி முடிவு செய்தது என்று பாருங்கள்.",
        'sensor_reads': "AI காரணத்தை சோதிக்க சென்சார் அளவீடுகளை மாற்றவும்."
    }
}
t = strings[st.session_state.lang]

# --- Sidebar Controls ---
with st.sidebar:
    st.header("⚙️ " + t['field_config'])
    
    crop_type = st.selectbox(
        t['crop_type'],
        ["Rice (Paddy)", "Wheat", "Sugarcane", "Cotton"]
    )
    
    growth_stage = st.selectbox(
        t['growth_stage'],
        ["Vegetative", "Reproductive", "Ripening"]
    )
    
    field_size = st.number_input(
        t['field_size'],
        min_value=0.1,
        value=1.5,
        step=0.1
    )
    
    st.divider()
    
    st.header("🎮 " + t['sim_controls'])
    st.caption(t['sensor_reads'])
    
    soil_offset = st.slider(
        t['moisture_offset'],
        min_value=-30,
        max_value=40,
        value=0,
        format="%d%%"
    )
    
    rain_offset = st.slider(
        t['rain_offset'],
        min_value=-80,
        max_value=20,
        value=0,
        format="%d%%"
    )
    
    st.divider()
    st.button("🌐 English / தமிழ்", on_click=toggle_language)

# --- Main Logic ---
plan = generate_daily_plan(soil_offset, rain_offset, crop_type, growth_stage, field_size)
impact_data = generate_weekly_impact(soil_offset, rain_offset, crop_type, growth_stage, field_size)

# --- Header ---
col1, col2 = st.columns([3, 1])
with col1:
    st.title("💧 " + t['title'])
    st.caption(f"🚀 {t['subtitle']}")

with col2:
    # Micro Weather Card style
    weather_parts = plan['weather_summary'].split(',')
    st.metric(label=t['current_forecast'], value=weather_parts[0], delta=weather_parts[1])

st.divider()

# --- Rain Alert ---
current_rain_prob = max(0, min(100, 85 + rain_offset)) # Using base from mock data[0] which is 85
if current_rain_prob > 60:
    st.warning(f"🌧️ **Rain Alert!** High probability of rain ({current_rain_prob}%). Irrigation may be skipped.")
elif current_rain_prob > 20:
    st.info(f"☁️ Moderate rain chance ({current_rain_prob}%). Monitoring closely.")
else:
    st.success(f"☀️ Clear skies ({current_rain_prob}% rain chance). Standard irrigation logic applies.")

# --- Content Grid ---
c1, c2 = st.columns([2, 1])

with c1:
    st.subheader(f"📅 {t['daily_schedule']}")
    
    # metrics row
    m1, m2, m3 = st.columns(3)
    m1.metric("Action", plan['action'], help="Recommended action")
    m2.metric("Amount", f"{plan['amount_liters_per_hectare']:,} L/ha", help="Liters per hectare")
    m3.metric("Total Volume", f"{plan['total_amount_liters']:,.0f} L", delta=f"{plan['savings_vs_fixed']:,.0f} L Saved", delta_color="normal")
    
    st.markdown("### " + t['trace_title'])
    with st.expander(t['trace_desc'], expanded=True):
        for step in plan['reasoning_trace']:
            icon = "✅" if step['result'] == "SAFE" else "💧" if step['result'] == "WATER" else "⚠️" if step['result'] == "WARNING" else "🛑"
            st.markdown(f"**{step['step']}. {step['description']}**")
            st.markdown(f"> {icon} {step['details']}")
            st.divider()

with c2:
    st.subheader(f"📊 {t['weekly_impact']}")
    
    df = pd.DataFrame(impact_data)
    # Reshape for plotly
    df_melted = df.melt(id_vars=['name'], value_vars=['fixed', 'ai'], var_name='Type', value_name='Liters')
    
    fig = px.bar(
        df_melted, 
        x='name', 
        y='Liters', 
        color='Type',
        barmode='group',
        color_discrete_map={'fixed': '#94a3b8', 'ai': '#3b82f6'},
        height=350
    )
    fig.update_layout(margin=dict(l=0, r=0, t=0, b=0), legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1))
    st.plotly_chart(fig, use_container_width=True)
    
    total_ai = sum(d['ai'] for d in impact_data)
    total_fixed = sum(d['fixed'] for d in impact_data)
    saved = total_fixed - total_ai
    
    st.info(f"**Weekly Savings:** {saved:,.0f} Liters")
