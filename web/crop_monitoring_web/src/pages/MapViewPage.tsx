import { useState, useMemo, useEffect } from 'react'
import {
    Container,
    Box,
    Typography,
    Paper,
    FormControl,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    useTheme,
    alpha,
    Grid,
    IconButton,
    Tooltip,
} from '@mui/material'
import { MyLocation } from '@mui/icons-material'
import { MapContainer, TileLayer, Popup, CircleMarker, useMap, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchFields, fetchBlocks } from '@/services/database.service'
import type { Field } from '@/types/database.types'


function MapRecenter({ center }: { center: [number, number] }) {
    const map = useMap()
    useEffect(() => {
        map.setView(center)
    }, [center, map])
    return null
}

export function MapViewPage() {
    const theme = useTheme()
    const [fields, setFields] = useState<Field[]>([])
    const [blocks, setBlocks] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [selectedCropType, setSelectedCropType] = useState<string>('all')
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
    const [manualLocationRequest, setManualLocationRequest] = useState(false)

    useEffect(() => {
        const loadMapData = async () => {
            try {
                setIsLoading(true)
                const [fieldsData, blocksData] = await Promise.all([
                    fetchFields(),
                    fetchBlocks()
                ])
                setFields(fieldsData)
                setBlocks(blocksData)
            } catch (err: any) {
                setError(err)
            } finally {
                setIsLoading(false)
            }
        }
        loadMapData()

        // Get user location
        const getPosition = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        setUserLocation([position.coords.latitude, position.coords.longitude])
                    },
                    (error) => {
                        console.error('Error getting location:', error)
                    },
                    { enableHighAccuracy: true }
                )
            }
        }
        getPosition()
    }, [])

    const handleLocateMe = () => {
        if (navigator.geolocation) {
            setManualLocationRequest(true)
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc: [number, number] = [position.coords.latitude, position.coords.longitude]
                    setUserLocation(loc)
                    // We keep manualLocationRequest true for a moment to let useMemo trigger
                    setTimeout(() => setManualLocationRequest(false), 100)
                },
                (error) => {
                    console.error('Error getting location:', error)
                    setManualLocationRequest(false)
                }
            )
        }
    }

    // Get unique crop types
    const cropTypes = useMemo(() => {
        const types = new Set(fields.map(f => f.crop_type).filter(Boolean))
        return Array.from(types) as string[]
    }, [fields])

    // Filter fields
    const filteredFields = useMemo(() => {
        return fields.filter(f => {
            if (selectedCropType !== 'all' && f.crop_type !== selectedCropType) return false
            if (!f.latitude || !f.longitude) return false
            return true
        })
    }, [fields, selectedCropType])

    // Calculate center
    const mapCenter = useMemo(() => {
        // If user explicitly clicked "Locate Me", use that
        if (userLocation && manualLocationRequest) {
            return userLocation
        }
        // Otherwise prefer fields if they exist
        if (filteredFields.length > 0) {
            const avgLat = filteredFields.reduce((sum, f) => sum + (f.latitude || 0), 0) / filteredFields.length
            const avgLng = filteredFields.reduce((sum, f) => sum + (f.longitude || 0), 0) / filteredFields.length
            return [avgLat, avgLng] as [number, number]
        }
        return userLocation || [-1.2921, 36.8219] as [number, number]
    }, [filteredFields, userLocation, manualLocationRequest])

    const getMoistureColor = (percentage?: number) => {
        if (percentage === undefined || percentage === null) return '#94a3b8' // Slate (Unknown)
        if (percentage < 20) return theme.palette.error.main // Red
        if (percentage < 40) return theme.palette.warning.main // Orange
        return '#0ea5e9' // Sky Blue (Optimal)
    }

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress color="primary" />
            </Box>
        )
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error" variant="filled" sx={{ borderRadius: 3 }}>
                    Error loading map data: {error.message}
                </Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="xl" sx={{ pb: 6 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2 }}>
                <Box>
                    <Typography variant="h3" fontWeight={900} sx={{ color: 'white' }}>
                        Geo-Spatial <span style={{ color: theme.palette.primary.light }}>Intelligence Map</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600 }}>
                        Real-time moisture-based monitoring and remote surveillance visualization.
                    </Typography>
                </Box>

                <Box sx={{ minWidth: 250 }}>
                    <FormControl fullWidth variant="filled" hiddenLabel>
                        <Select
                            value={selectedCropType}
                            onChange={(e) => setSelectedCropType(e.target.value)}
                            sx={{
                                borderRadius: 3,
                                bgcolor: alpha(theme.palette.background.paper, 0.1),
                                backdropFilter: 'blur(10px)',
                                '&:before, &:after': { display: 'none' }
                            }}
                        >
                            <MenuItem value="all">Analyze All Varieties</MenuItem>
                            {cropTypes.map(type => (
                                <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            <Paper sx={{
                p: 0,
                overflow: 'hidden',
                height: { xs: '60vh', md: 'calc(100vh - 280px)' },
                minHeight: 500,
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 3,
            }}>
                <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; Google'
                        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                    />
                    <MapRecenter center={mapCenter} />

                    {userLocation && (
                        <CircleMarker
                            center={userLocation}
                            radius={8}
                            pathOptions={{
                                fillColor: theme.palette.primary.main,
                                fillOpacity: 1,
                                color: 'white',
                                weight: 3
                            }}
                        >
                            <Popup>
                                <Typography variant="subtitle2" fontWeight={800}>Your Location</Typography>
                            </Popup>
                        </CircleMarker>
                    )}

                    {blocks.map((block) => (
                        <GeoJSON
                            key={block.id}
                            data={block.geom}
                            style={{
                                color: theme.palette.primary.light,
                                weight: 2,
                                fillOpacity: 0.1,
                                dashArray: '5, 10'
                            }}
                        >
                            <Popup>
                                <Box sx={{ p: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={900} color="primary.main">
                                        BLOCK: {block.block_id}
                                    </Typography>
                                    {block.name && (
                                        <Typography variant="body2">{block.name}</Typography>
                                    )}
                                </Box>
                            </Popup>
                        </GeoJSON>
                    ))}

                    {filteredFields.map((field, idx) => (
                        <CircleMarker
                            key={idx}
                            center={[field.latitude!, field.longitude!]}
                            radius={12}
                            pathOptions={{
                                fillColor: getMoistureColor(field.latest_moisture),
                                fillOpacity: 0.8,
                                color: 'white',
                                weight: 2
                            }}
                        >
                            <Popup className="agro-popup">
                                <Box sx={{ p: 1, minWidth: 240 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="subtitle2" fontWeight={900} color="primary.main">
                                            {field.field_name?.toUpperCase() || 'UNKNOWN FIELD'}
                                        </Typography>
                                        <Box sx={{
                                            px: 1,
                                            py: 0.2,
                                            bgcolor: alpha(getMoistureColor(field.latest_moisture), 0.1),
                                            borderRadius: 1,
                                            border: `1px solid ${getMoistureColor(field.latest_moisture)}`
                                        }}>
                                            <Typography variant="caption" fontWeight={900} sx={{ color: getMoistureColor(field.latest_moisture) }}>
                                                {field.latest_moisture ? `${field.latest_moisture}%` : 'NO DATA'}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    <Typography variant="caption" display="block" sx={{ opacity: 0.6, mb: 1.5 }}>
                                        {field.section_name} / {field.block_id}
                                    </Typography>

                                    <Grid container spacing={2} sx={{ mb: 2 }}>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>VARIETY</Typography>
                                            <Typography variant="body2" fontWeight={700}>{field.crop_type || 'N/A'}</Typography>
                                        </Grid>
                                        <Grid size={{ xs: 6 }}>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>PRESSURE</Typography>
                                            <Typography variant="body2" fontWeight={700} color={field.latest_stress && field.latest_stress !== 'None' ? 'error.main' : 'success.main'}>
                                                {field.latest_stress || 'OPTIMAL'}
                                            </Typography>
                                        </Grid>
                                    </Grid>

                                    {field.latest_image && (
                                        <Box sx={{ mt: 1, position: 'relative' }}>
                                            <img
                                                src={field.latest_image}
                                                alt="Field"
                                                style={{
                                                    width: '100%',
                                                    height: 140,
                                                    objectFit: 'cover',
                                                    borderRadius: 8,
                                                }}
                                            />
                                            <Box sx={{
                                                position: 'absolute',
                                                bottom: 4,
                                                right: 4,
                                                bgcolor: 'rgba(0,0,0,0.6)',
                                                px: 1,
                                                borderRadius: 2,
                                                backdropFilter: 'blur(4px)'
                                            }}>
                                                <Typography variant="caption" sx={{ color: 'white', fontWeight: 800 }}>LIVE PIC</Typography>
                                            </Box>
                                        </Box>
                                    )}

                                    <Typography variant="caption" sx={{ mt: 2, display: 'block', opacity: 0.4, fontStyle: 'italic' }}>
                                        Observations: {field.observation_count}
                                    </Typography>
                                </Box>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>

                {/* Floating Map Legend Overlay */}
                <Box sx={{
                    position: 'absolute',
                    top: 24,
                    right: 24,
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5
                }}>
                    <Tooltip title="Locate Me" placement="left">
                        <IconButton
                            onClick={handleLocateMe}
                            sx={{
                                bgcolor: 'rgba(15, 23, 42, 0.9)',
                                color: 'primary.light',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                '&:hover': {
                                    bgcolor: 'primary.main',
                                    color: 'white'
                                }
                            }}
                        >
                            <MyLocation />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* Floating Map Legend Overlay */}
                <Box sx={{
                    position: 'absolute',
                    bottom: 24,
                    right: 24,
                    bgcolor: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(12px)',
                    p: 2.5,
                    borderRadius: 4,
                    border: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 1000,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}>
                    <Typography variant="caption" fontWeight={900} sx={{ color: 'primary.light', mb: 1.5, display: 'block', letterSpacing: 1.5 }}>MOISTURE SCALE</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#0ea5e9' }} />
                            <Typography variant="caption" fontWeight={600}>Optimal (&gt;40%)</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.warning.main }} />
                            <Typography variant="caption" fontWeight={600}>Watch-List (20-40%)</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.error.main }} />
                            <Typography variant="caption" fontWeight={600}>Critical Stress (&lt;20%)</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 12, height: 2, bgcolor: theme.palette.primary.light, opacity: 0.6 }} />
                            <Typography variant="caption" fontWeight={600}>Block Boundary</Typography>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            <Box sx={{ mt: 4 }}>
                <Alert severity="success" variant="outlined" sx={{ borderRadius: 3, color: 'primary.light', borderColor: alpha(theme.palette.primary.main, 0.2) }}>
                    <Typography variant="body2" fontWeight={600}>
                        Spatial intelligence is active. Monitor moisture-based trends and view validated field boundaries (dashed) for precise surveillance.
                    </Typography>
                </Alert>
            </Box>

            <style>{`
                .agro-popup .leaflet-popup-content-wrapper {
                    background: #1e293b !important;
                    color: white !important;
                    border-radius: 16px !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    padding: 0 !important;
                }
                .agro-popup .leaflet-popup-content {
                    margin: 0 !important;
                    padding: 12px !important;
                }
                .agro-popup .leaflet-popup-tip {
                    background: #1e293b !important;
                }
            `}</style>
        </Container>
    )
}
