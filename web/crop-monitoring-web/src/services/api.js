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

// Fields
export const getFields = async () => {
    const response = await api.get('/fields/');
    return response.data;
};

export const getFieldMapData = async () => {
    const response = await api.get('/fields/map_data/');
    return response.data;
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
export const getWeatherData = async (city = 'Jinja,UG') => {
    // OpenWeatherMap API (placeholder key)
    const API_KEY = process.env.REACT_APP_WEATHER_API_KEY;
    if (!API_KEY) throw new Error('No API key');

    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
    return response.data;
};

export default api;
