import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { Box, Typography } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const InsetMapControl = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [10, 10], animate: false });
        }
    }, [bounds, map]);
    return null;
};

const FieldMapHeader = ({ boundary, height = 200 }) => {
    const [bounds, setBounds] = useState(null);

    useEffect(() => {
        if (boundary && (boundary.type === 'Polygon' || boundary.coordinates)) {
            try {
                // Ensure format is [ [lat, lon], ... ] for Leaflet
                const coords = boundary.type === 'Polygon' ? boundary.coordinates[0] : boundary.coordinates;
                const leafletCoords = coords.map(c => [c[1], c[0]]);
                const b = L.latLngBounds(leafletCoords);
                if (b.isValid()) setBounds(b);
            } catch (e) {
                console.error("Invalid boundary for FieldMapHeader", e);
            }
        }
    }, [boundary]);

    if (!bounds) {
        return (
            <Box sx={{
                height,
                width: '100%',
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
            }}>
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 700 }}>
                    INITIALIZING MAP...
                </Typography>
            </Box>
        );
    }

    const coords = boundary.type === 'Polygon' ? boundary.coordinates[0] : boundary.coordinates;
    const leafletCoords = coords.map(c => [c[1], c[0]]);

    return (
        <Box sx={{
            height,
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
            '& .leaflet-container': { height: '100%', width: '100%' },
            '& .leaflet-control-container': { display: 'none' } // Hide zoom controls etc.
        }}>
            <MapContainer
                center={bounds.getCenter()}
                zoom={15}
                dragging={false}
                touchZoom={false}
                doubleClickZoom={false}
                scrollWheelZoom={false}
                attributionControl={false}
            >
                <InsetMapControl bounds={bounds} />
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                <Polygon
                    positions={leafletCoords}
                    pathOptions={{
                        color: 'white',
                        weight: 3,
                        fillColor: '#10B981',
                        fillOpacity: 0.3
                    }}
                />
            </MapContainer>
            {/* Subtle overlay to make text pop if needed */}
            <Box sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0,0,0,0.05)',
                pointerEvents: 'none',
                zIndex: 1000
            }} />
        </Box>
    );
};

export default FieldMapHeader;
