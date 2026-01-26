import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Box,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getFieldMapData } from '../services/api';
import { useLocation } from 'react-router-dom';
import axios from 'axios'; // Import axios for API calls

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const WEATHER_API_KEY = 'your_openweathermap_api_key'; // Replace with your API key

const ChangeView = ({ center, zoom, bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        } else if (center && zoom) {
            map.setView(center, zoom);
        }
    }, [center, zoom, bounds, map]);
    return null;
};

const MapView = () => {
    const location = useLocation();
    const [mapData, setMapData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState(location.state?.center || [-1.2921, 36.8219]); // Default Nairobi
    const [zoom, setZoom] = useState(13);

    // Filters
    const [cropVariety, setCropVariety] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [bounds, setBounds] = useState(null); // State to store bounds
    const [weatherData, setWeatherData] = useState(null);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Fly to user location if available
        if (navigator.geolocation && !location.state?.center) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                setMapCenter([latitude, longitude]);
                setZoom(13);
            }, (error) => {
                console.log('Error getting location for map:', error);
            });
        }
    }, [location.state?.center]); // Added missing dependency

    useEffect(() => {
        loadMapData();
    }, []);

    const loadMapData = async () => {
        try {
            const data = await getFieldMapData();

            // Filter GeoJSON layers based on user-assigned fields
            const userAssignedFields = data.features.filter((feature) => {
                return feature.properties.isAssigned; // Assuming `isAssigned` is a backend-provided flag
            });

            setMapData({ ...data, features: userAssignedFields });
        } catch (error) {
            console.error('Error loading map data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (mapData?.features?.length > 0) {
            try {
                const geoJsonLayer = L.geoJSON(mapData);
                const calculatedBounds = geoJsonLayer.getBounds();
                if (calculatedBounds.isValid()) {
                    setBounds(calculatedBounds); // Update bounds state
                }
            } catch (e) {
                console.error('Error calculating bounds:', e);
            }
        }
    }, [mapData]);

    useEffect(() => {
        if (mapCenter) {
            const [lat, lon] = mapCenter;
            fetchWeatherData(lat, lon).then((data) => setWeatherData(data));
        }
    }, [mapCenter]);

    const fetchWeatherData = async (lat, lon) => {
        try {
            const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
                params: {
                    lat,
                    lon,
                    appid: WEATHER_API_KEY,
                    units: 'metric',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return null;
        }
    };

    const fetchNotifications = async (fieldIds) => {
        try {
            const response = await axios.post('/api/notifications', { fieldIds });
            return response.data;
        } catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    };

    useEffect(() => {
        if (mapData?.features) {
            const fieldIds = mapData.features.map((feature) => feature.properties.field_id);
            fetchNotifications(fieldIds).then((data) => setNotifications(data));
        }
    }, [mapData]);


    if (loading) return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;

    const varieties = mapData ? ['All', ...new Set(mapData.features.map(f => f.properties.crop_variety).filter(Boolean))] : ['All'];

    const filteredFeatures = mapData?.features.filter(feature => {
        const matchesVariety = cropVariety === 'All' || feature.properties.crop_variety === cropVariety;

        let matchesDate = true;
        if (startDate || endDate) {
            const createdDate = new Date(feature.properties.created_at);
            if (startDate && createdDate < new Date(startDate)) matchesDate = false;
            if (endDate && createdDate > new Date(endDate)) matchesDate = false;
        }

        return matchesVariety && matchesDate;
    }) || [];

    const FieldPopup = ({ feature }) => {
        const [indices, setIndices] = useState(null);
        const [loadingIndices, setLoadingIndices] = useState(true);

        useEffect(() => {
            const fetchIndices = async () => {
                try {
                    const token = localStorage.getItem('accessToken');
                    const response = await axios.get(`http://127.0.0.1:8000/api/fields/${feature.id}/indices/`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setIndices(response.data);
                } catch (error) {
                    console.error('Error fetching indices:', error);
                } finally {
                    setLoadingIndices(false);
                }
            };
            fetchIndices();
        }, [feature.id]);

        return (
            <Card variant="outlined" sx={{ minWidth: 280, border: 'none', boxShadow: 'none' }}>
                <CardContent sx={{ p: 0 }}>
                    <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 800, mb: 1 }}>
                        {feature.properties.field_id}
                    </Typography>

                    <Grid container spacing={1} sx={{ mb: 2 }}>
                        <Grid item xs={12}>
                            <Typography variant="body2"><strong>Variety:</strong> {feature.properties.crop_variety || 'N/A'}</Typography>
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="body2"><strong>Collector:</strong> {feature.properties.created_by_name}</Typography>
                        </Grid>
                    </Grid>

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>Satellite Indices (Live)</Typography>

                    {loadingIndices ? (
                        <Box display="flex" justifyContent="center" p={2}><CircularProgress size={20} /></Box>
                    ) : indices ? (
                        <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'grey.50', borderRadius: 2 }}>
                            <Table size="small" padding="none">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Index</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.7rem', p: 0.5 }}>Value</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Object.entries(indices).map(([key, value]) => (
                                        <TableRow key={key}>
                                            <TableCell sx={{ fontSize: '0.75rem', p: 0.5 }}>
                                                <Tooltip title="Satellite Derived Index">
                                                    <span style={{ cursor: 'help', borderBottom: '1px dotted #ccc' }}>{key}</span>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="right" sx={{
                                                fontSize: '0.75rem',
                                                p: 0.5,
                                                fontWeight: 'bold',
                                                color: (key === 'NDVI' || key === 'EVI') ? (value > 0.6 ? 'green' : 'orange') : 'text.primary'
                                            }}>
                                                {value}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography variant="caption" color="text.secondary">Failed to load indices.</Typography>
                    )}

                    <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block', fontStyle: 'italic' }}>
                        Updated: {new Date().toLocaleDateString()}
                    </Typography>
                </CardContent>
            </Card>
        );
    };

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" gutterBottom>Interactive Field Map</Typography>

            {/* Notifications Section */}
            {notifications.length > 0 && (
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6">Alerts and Notifications</Typography>
                    <ul>
                        {notifications.map((notification, index) => (
                            <li key={index}>{notification.message}</li>
                        ))}
                    </ul>
                </Paper>
            )}

            {/* Weather Section */}
            {weatherData && (
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6">Weather Updates</Typography>
                    <Typography variant="body1">
                        <strong>Temperature:</strong> {weatherData.main.temp}°C
                    </Typography>
                    <Typography variant="body1">
                        <strong>Condition:</strong> {weatherData.weather[0].description}
                    </Typography>
                    <Typography variant="body1">
                        <strong>Humidity:</strong> {weatherData.main.humidity}%
                    </Typography>
                </Paper>
            )}

            {/* Filters Section */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                            <InputLabel>Crop Variety</InputLabel>
                            <Select
                                value={cropVariety}
                                label="Crop Variety"
                                onChange={(e) => setCropVariety(e.target.value)}
                            >
                                {varieties.map(v => (
                                    <MenuItem key={v} value={v}>{v}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="Start Date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            label="End Date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                </Grid>
            </Paper>

            <Paper elevation={3} sx={{ height: '70vh', width: '100%', mb: 4, borderRadius: 2, overflow: 'hidden' }}>
                <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }}>
                    <ChangeView center={mapCenter} zoom={zoom} bounds={bounds} />
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                        maxZoom={19}
                    />

                    {filteredFeatures.map((feature) => {
                        // Handle null geometry by falling back to location point in properties
                        const geometry = feature.geometry || feature.properties.location;
                        if (!geometry || !geometry.coordinates) return null;

                        const isPolygon = geometry.type === 'Polygon';
                        const coords = isPolygon
                            ? geometry.coordinates[0].map(c => [c[1], c[0]])
                            : [geometry.coordinates[1], geometry.coordinates[0]];

                        return (
                            <React.Fragment key={feature.id}>
                                {isPolygon ? (
                                    <Polygon
                                        positions={coords}
                                        pathOptions={{
                                            color: '#00C853',
                                            weight: 4,
                                            fillOpacity: 0.1,
                                            fillColor: '#00C853'
                                        }}
                                    >
                                        <Popup>
                                            <FieldPopup feature={feature} />
                                        </Popup>
                                    </Polygon>
                                ) : (
                                    <Marker position={coords}>
                                        <Popup>
                                            <FieldPopup feature={feature} />
                                        </Popup>
                                    </Marker>
                                )}
                            </React.Fragment>
                        );
                    })}
                </MapContainer>
            </Paper>
        </Container>
    );
};

export default MapView;
