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
    TextField
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polygon, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { getFieldMapData } from '../services/api';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapView = () => {
    const [mapData, setMapData] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [cropVariety, setCropVariety] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        loadMapData();
    }, []);

    const loadMapData = async () => {
        try {
            const data = await getFieldMapData();
            setMapData(data);
        } catch (error) {
            console.error('Error loading map data:', error);
        } finally {
            setLoading(false);
        }
    };

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

    // Default center if no fields
    let center = [-1.286389, 36.817223]; // Nairobi default

    if (filteredFeatures.length > 0) {
        const firstFeature = filteredFeatures[0];
        if (firstFeature.geometry && firstFeature.geometry.coordinates) {
            center = [firstFeature.geometry.coordinates[1], firstFeature.geometry.coordinates[0]];
        } else if (firstFeature.properties.location && firstFeature.properties.location.coordinates) {
            center = [firstFeature.properties.location.coordinates[1], firstFeature.properties.location.coordinates[0]];
        }
    }

    const FieldPopup = ({ feature }) => (
        <Card variant="outlined" sx={{ minWidth: 220, border: 'none' }}>
            <CardContent sx={{ p: 1 }}>
                <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
                    {feature.properties.field_id}
                </Typography>
                <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>Variety:</strong> {feature.properties.crop_variety || 'N/A'}
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>Collector:</strong> {feature.properties.created_by_name}
                    </Typography>
                    <Typography variant="body2" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong>Observations:</strong> {feature.properties.observation_count}
                    </Typography>
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    Added: {new Date(feature.properties.created_at).toLocaleDateString()}
                </Typography>
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" gutterBottom>Interactive Field Map</Typography>

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
                <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Satellite (Esri)">
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EBP, and the GIS User Community'
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Street Map (OSM)">
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>

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
                                        pathOptions={{ color: '#4caf50', weight: 3, fillOpacity: 0.2 }}
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
