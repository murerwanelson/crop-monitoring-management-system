import requests
import logging

logger = logging.getLogger(__name__)

# You can replace this with your actual OpenWeatherMap API key
OWM_API_KEY = "8580556e729f6b98ea5a8b7593922312"  

def get_weather_description(lat, lon):
    """
    Fetches the weather description for a given latitude and longitude.
    Returns a string description (e.g., 'Cloudy', 'Sunny') or 'Unknown'.
    """
    if not lat or not lon:
        return "Unknown"

    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OWM_API_KEY}&units=metric"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'weather' in data and len(data['weather']) > 0:
                main_weather = data['weather'][0]['main']
                description = data['weather'][0]['description'].capitalize()
                return f"{main_weather} ({description})"
        
        logger.warning(f"Weather API returned status {response.status_code}: {response.text}")
        return "Unknown"
    except Exception as e:
        logger.error(f"Error fetching weather: {e}")
        return "Unknown (API Error)"
