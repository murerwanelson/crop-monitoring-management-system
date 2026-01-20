import axios from 'axios';

const API_BASE_URL = 'http://10.72.49.103:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                try {
                    // Call token refresh endpoint directly using axios to avoid original interceptors
                    const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
                        refresh: refreshToken,
                    });

                    const { access } = response.data;
                    localStorage.setItem('accessToken', access);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // If refresh fails, clear storage and redirect to login
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// Authentication
export const register = async (userData) => {
    const response = await api.post('/register/', userData);
    return response.data;
};

export const login = async (username, password) => {
    // Note: The token endpoint is outside /api/ prefix if mapped directly in main urls.py 
    // but I mapped it to /api/token/ so it's OK with base URL http://.../api
    const response = await api.post('/token/', { username, password });
    return response.data;
};

export const getCurrentUser = async () => {
    const response = await api.get('/users/me/');
    return response.data;
};

// Fields
export const getFields = async () => {
    const response = await api.get('/fields/');
    return response.data;
};

export const getFieldMapData = async () => {
    const response = await api.get('/fields/map_data/');
    return response.data;
};

export const createField = async (data) => {
    const response = await api.post('/fields/', data);
    return response.data;
};

export const updateField = async (id, data) => {
    const response = await api.patch(`/fields/${id}/`, data);
    return response.data;
};

export const deleteField = async (id) => {
    await api.delete(`/fields/${id}/`);
};

// Observations
export const getObservations = async () => {
    const response = await api.get('/observations/');
    return response.data;
};

export const getObservation = async (id) => {
    const response = await api.get(`/observations/${id}/`);
    return response.data;
};

export const createObservation = async (data) => {
    const response = await api.post('/observations/', data);
    return response.data;
};

export const updateObservation = async (id, data) => {
    const response = await api.put(`/observations/${id}/`, data);
    return response.data;
};

export const deleteObservation = async (id) => {
    await api.delete(`/observations/${id}/`);
};

// Statistics
export const getDashboardStats = async (days = 30) => {
    const response = await api.get(`/stats/dashboard/?days=${days}`);
    return response.data;
};

export const getMoistureTrends = async (days = 30) => {
    const response = await api.get(`/stats/moisture_trends/?days=${days}`);
    return response.data;
};

export const getGrowthAnalysis = async (cropVariety = null) => {
    const url = `/stats/growth_analysis/${cropVariety ? `?crop_variety=${cropVariety}` : ''}`;
    const response = await api.get(url);
    return response.data;
};

// Weather
// Weather Service (Switched to Open-Meteo for free access without API Key)
export const getWeatherData = async (params = { city: 'Jinja,UG' }) => {
    let lat = 0.4479, lon = 33.2026; // Default Jinja

    // 1. Resolve Coordinates
    if (params.lat && params.lon) {
        lat = params.lat;
        lon = params.lon;
    } else {
        // If city name is provided, we would ideally geocode it. 
        // For simplicity in this demo without a key, we'll default to Jinja if no coords.
        // Or we could use a geocoding API, but let's assume coords are primary.
    }

    try {
        // 2. Fetch Weather from Open-Meteo
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,is_day`;
        const weatherRes = await axios.get(weatherUrl);
        const current = weatherRes.data.current;

        // 3. Fetch Location Name (Reverse Geocoding via Nominatim)
        // Note: Nominatim requires a User-Agent header, but browsers set it automatically.
        let cityName = params.city || 'Unknown Location';
        if (params.lat && params.lon) {
            try {
                const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
                const geoRes = await axios.get(geoUrl);
                const address = geoRes.data.address;
                cityName = address.city || address.town || address.village || address.county || 'Local Field';
            } catch (e) {
                console.warn('Reverse geocoding failed', e);
            }
        }

        // 4. Map WMO Weather Codes to Descriptions
        const wmoCodes = {
            0: 'Clear Sky',
            1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
            45: 'Fog', 48: 'Depositing Rime Fog',
            51: 'Light Drizzle', 53: 'Moderate Drizzle', 55: 'Dense Drizzle',
            61: 'Slight Rain', 63: 'Moderate Rain', 65: 'Heavy Rain',
            71: 'Slight Snow', 73: 'Moderate Snow', 75: 'Heavy Snow',
            80: 'Slight Showers', 81: 'Moderate Showers', 82: 'Violent Showers',
            95: 'Thunderstorm', 96: 'Thunderstorm with Hail', 99: 'Heavy Thunderstorm'
        };
        const weatherDesc = wmoCodes[current.weather_code] || 'Variable';

        // 5. Return data in the structure expected by Home.js
        return {
            main: {
                temp: current.temperature_2m,
                humidity: current.relative_humidity_2m
            },
            weather: [{ main: weatherDesc }],
            name: cityName
        };

    } catch (error) {
        console.error("Open-Meteo Error:", error);
        throw error;
    }
};

export default api;
