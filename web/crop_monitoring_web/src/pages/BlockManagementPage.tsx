import { useState, useCallback } from 'react'
import {
    Container,
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Alert,
    CircularProgress,
    alpha,
    useTheme,
    Grid,
    Card,
    CardContent,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from '@mui/material'
import {
    CloudUpload,
    MapOutlined,
    CheckCircleOutline,
    ErrorOutline,
    Layers,
} from '@mui/icons-material'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import shp from 'shpjs'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

function MapRecenter({ data }: { data: any }) {
    const map = useMap()
    if (data) {
        const geoJsonLayer = L.geoJSON(data)
        map.fitBounds(geoJsonLayer.getBounds())
    }
    return null
}

export function BlockManagementPage() {
    const theme = useTheme()
    const { user } = useAuth()
    const [file, setFile] = useState<File | null>(null)
    const [blockId, setBlockId] = useState('')
    const [geoJson, setGeoJson] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setIsLoading(true)
        setStatus(null)
        setGeoJson(null)

        try {
            const arrayBuffer = await selectedFile.arrayBuffer()
            const data = await shp(arrayBuffer)

            // Validate geometry - must be Polygon or MultiPolygon
            const features = Array.isArray(data) ? data[0].features : data.features
            if (!features || features.length === 0) {
                throw new Error('No valid vector features found in shapefile.')
            }

            // Check if features are polygons
            const isValid = features.every((f: any) =>
                f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
            )

            if (!isValid) {
                throw new Error('Shapefile must contain Polygon or MultiPolygon geometries.')
            }

            setGeoJson(Array.isArray(data) ? data[0] : data)
            setStatus({ type: 'success', message: 'Shapefile parsed successfully! Preview the boundary below.' })
        } catch (err: any) {
            console.error('Shapefile parsing error:', err)
            setStatus({ type: 'error', message: `Invalid Shapefile: ${err.message}` })
            setFile(null)
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleUpload = async () => {
        if (!blockId.trim()) {
            setStatus({ type: 'error', message: 'Please enter a unique Block ID.' })
            return
        }
        if (!geoJson) {
            setStatus({ type: 'error', message: 'Please upload a valid shapefile first.' })
            return
        }

        setIsSaving(true)
        setStatus({ type: 'info', message: 'Saving block data to PostGIS...' })

        try {
            // Check if block_id already exists
            const { data: existing } = await supabase
                .from('blocks')
                .select('block_id')
                .eq('block_id', blockId.trim())
                .single()

            if (existing) {
                throw new Error(`Block ID "${blockId}" already exists. Please use a unique identifier.`)
            }

            // Insert into Supabase
            // Note: We send the geometry as a standard GeoJSON feature/featurecollection
            // PostGIS ST_GeomFromGeoJSON handles the conversion if we use the right syntax
            // or we can use a raw string for complex geometries.
            // For simple cases, Supabase handles GeoJSON directly if the column is geography/geometry

            // Package geometry: Ensure we ALWAYS send a MultiPolygon to match the database schema
            let finalGeom: any = null;

            if (geoJson.features.length > 0) {
                const allPolygons: any[] = [];
                geoJson.features.forEach((f: any) => {
                    if (f.geometry.type === 'Polygon') {
                        allPolygons.push(f.geometry.coordinates);
                    } else if (f.geometry.type === 'MultiPolygon') {
                        allPolygons.push(...f.geometry.coordinates);
                    }
                });

                if (allPolygons.length === 0) {
                    throw new Error('No valid Polygon features found in the uploaded file.');
                }

                finalGeom = {
                    type: 'MultiPolygon',
                    coordinates: allPolygons
                };
            } else {
                throw new Error('No features detected in the Geospatial data.');
            }

            // Clean 3D Coordinates (remove Z-index if present)
            const stripZCoordinates = (coords: any[]): any[] => {
                if (typeof coords[0] === 'number') {
                    // It's a point [x, y, z?]
                    return coords.slice(0, 2)
                }
                return coords.map(stripZCoordinates)
            }

            finalGeom.coordinates = stripZCoordinates(finalGeom.coordinates)

            const { error: insertError } = await supabase
                .from('blocks')
                .insert({
                    block_id: blockId.trim(),
                    geom: finalGeom,
                    created_by: user?.id,
                })

            if (insertError) {
                console.error('Supabase Insert Error Details:', insertError);
                // Specifically handle RLS or type mismatch errors
                if (insertError.code === '42804') {
                    throw new Error('Geometry type mismatch. Ensure the shapefile contains Polygons.');
                }
                if (insertError.code === '42501') {
                    throw new Error('Permission Denied. You must be an Admin or Supervisor to upload blocks.');
                }
                throw new Error(insertError.message || 'Unknown database error occurred.');
            }

            setStatus({ type: 'success', message: `Block ${blockId} successfully synchronized with GIS database.` })
            setFile(null)
            setBlockId('')
            setGeoJson(null)
        } catch (err: any) {
            console.error('Upload error:', err)
            setStatus({ type: 'error', message: `Database Error: ${err.message}` })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Container maxWidth="xl" sx={{ pb: 6 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: 'white' }}>
                    Block <span style={{ color: theme.palette.primary.light }}>Management</span>
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600 }}>
                    Upload cadastral shapefiles (.zip or .dbf/.shp) to define official agricultural sector boundaries.
                </Typography>
            </Box>

            <Grid container spacing={4}>
                <Grid size={{ xs: 12, lg: 4 }}>
                    <Card sx={{
                        height: '100%',
                        bgcolor: alpha(theme.palette.background.paper, 0.05),
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 6,
                    }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ mb: 3 }}>
                                Ingestion Engine
                            </Typography>

                            <Box sx={{ mb: 4 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                    BLOCK IDENTIFIER
                                </Typography>
                                <TextField
                                    fullWidth
                                    placeholder="e.g. SEC-A-102"
                                    variant="filled"
                                    value={blockId}
                                    onChange={(e) => setBlockId(e.target.value.toUpperCase())}
                                    sx={{
                                        '& .MuiFilledInput-root': { borderRadius: 3, bgcolor: 'rgba(255,255,255,0.05)' }
                                    }}
                                />
                            </Box>

                            <Box sx={{ mb: 4 }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                    GEOSPATIAL SOURCE (.ZIP)
                                </Typography>
                                <input
                                    type="file"
                                    accept=".zip,.shp"
                                    id="shapefile-upload"
                                    hidden
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="shapefile-upload">
                                    <Button
                                        component="span"
                                        fullWidth
                                        variant="outlined"
                                        startIcon={isLoading ? <CircularProgress size={20} /> : <CloudUpload />}
                                        sx={{
                                            py: 4,
                                            borderStyle: 'dashed',
                                            borderWidth: 2,
                                            borderRadius: 4,
                                            bgcolor: file ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                                            borderColor: file ? theme.palette.primary.main : 'rgba(255,255,255,0.2)',
                                        }}
                                    >
                                        {file ? file.name : 'Select Zipped Shapefile'}
                                    </Button>
                                </label>
                            </Box>

                            {status && (
                                <Alert
                                    severity={status.type}
                                    sx={{ mb: 4, borderRadius: 3 }}
                                    icon={status.type === 'success' ? <CheckCircleOutline /> : <ErrorOutline />}
                                >
                                    {status.message}
                                </Alert>
                            )}

                            <Button
                                fullWidth
                                variant="contained"
                                size="large"
                                onClick={handleUpload}
                                disabled={!file || !blockId || isSaving || isLoading}
                                sx={{
                                    py: 2,
                                    borderRadius: 3,
                                    fontWeight: 900,
                                    boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.3)}`
                                }}
                            >
                                {isSaving ? 'Synchronizing GIS...' : 'Index New Block'}
                            </Button>

                            <Box sx={{ mt: 4 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1.5 }}>
                                    COMPATIBILITY MATRIX
                                </Typography>
                                <List dense>
                                    <ListItem>
                                        <ListItemIcon><Layers sx={{ fontSize: 16, color: 'primary.light' }} /></ListItemIcon>
                                        <ListItemText primary="WGS84 Coordinate System preferred" />
                                    </ListItem>
                                    <ListItem>
                                        <ListItemIcon><Layers sx={{ fontSize: 16, color: 'primary.light' }} /></ListItemIcon>
                                        <ListItemText primary="Zipped bundles (.shp, .dbf, .shx)" />
                                    </ListItem>
                                </List>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, lg: 8 }}>
                    <Paper sx={{
                        p: 0,
                        overflow: 'hidden',
                        height: 700,
                        position: 'relative',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 3,
                        bgcolor: '#0f172a'
                    }}>
                        {!geoJson ? (
                            <Box sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                opacity: 0.5
                            }}>
                                <MapOutlined sx={{ fontSize: 80, mb: 2, color: 'primary.main' }} />
                                <Typography variant="h6" fontWeight={800}>Geospatial Preview Pending</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    Upload a shapefile to visualize the sector boundaries
                                </Typography>
                            </Box>
                        ) : (
                            <MapContainer
                                center={[-1.2921, 36.8219]}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    attribution='&copy; Google'
                                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                                />
                                <MapRecenter data={geoJson} />
                                <GeoJSON
                                    data={geoJson}
                                    style={{
                                        color: theme.palette.primary.main,
                                        weight: 3,
                                        fillOpacity: 0.2,
                                        fillColor: theme.palette.primary.main
                                    }}
                                />
                                <Box sx={{
                                    position: 'absolute',
                                    top: 20,
                                    right: 20,
                                    zIndex: 1000,
                                    bgcolor: 'rgba(15, 23, 42, 0.9)',
                                    p: 2,
                                    borderRadius: 3,
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <Typography variant="caption" fontWeight={900} color="primary.light">
                                        PROJECTION: WGS84
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {geoJson.features.length} Sector(s) Detected
                                    </Typography>
                                </Box>
                            </MapContainer>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    )
}
