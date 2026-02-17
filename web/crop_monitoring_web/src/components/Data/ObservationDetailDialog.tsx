import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Grid,
    Box,
    Chip,
    Divider,
    alpha,
    useTheme,
    Paper,
    Tabs,
    Tab
} from '@mui/material';
import {
    LocationOn,
    Agriculture,
    WaterDrop,
    Grass,
    Science,
    BugReport,
    DateRange,
    Image as ImageIcon
} from '@mui/icons-material';
import { FullObservation } from '@/types/database.types';
import { format } from 'date-fns';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';

interface ObservationDetailDialogProps {
    open: boolean;
    onClose: () => void;
    observation: FullObservation | null;
    onGenerateReport: (obs: FullObservation) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export const ObservationDetailDialog: React.FC<ObservationDetailDialogProps> = ({
    open,
    onClose,
    observation,
    onGenerateReport
}) => {
    const theme = useTheme();
    const [tabValue, setTabValue] = React.useState(0);

    if (!observation) return null;

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const InfoRow = ({ label, value, icon }: { label: string, value: string | number | undefined, icon?: React.ReactNode }) => (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, borderBottom: '1px dashed rgba(255,255,255,0.1)', pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {icon && <Box sx={{ color: 'text.secondary', fontSize: 18 }}>{icon}</Box>}
                <Typography variant="body2" color="text.secondary">{label}</Typography>
            </Box>
            <Typography variant="body2" fontWeight={600}>{value || '-'}</Typography>
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    bgcolor: '#0f172a',
                    backgroundImage: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                    minHeight: '80vh'
                }
            }}
        >
            <DialogTitle sx={{ p: 0 }}>
                <Box sx={{ p: 3, bgcolor: alpha(theme.palette.primary.main, 0.1), borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography variant="caption" sx={{ letterSpacing: 1.5, color: 'primary.light', fontWeight: 800 }}>
                                FIELD OBSERVATION RECORD
                            </Typography>
                            <Typography variant="h4" fontWeight={900} sx={{ mt: 0.5 }}>
                                {observation.field_name}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                                <Chip label={observation.section_name} size="small" icon={<LocationOn />} sx={{ borderRadius: 1 }} />
                                <Chip label={observation.block_id} size="small" sx={{ borderRadius: 1 }} />
                                <Typography variant="body2" color="text.secondary">{format(new Date(observation.date_recorded), 'MMM dd, yyyy • HH:mm')}</Typography>
                            </Box>
                        </Box>
                        <Chip
                            label={`ID: ${String(observation.id).slice(0, 8)}`}
                            variant="outlined"
                            sx={{ borderColor: 'rgba(255,255,255,0.2)', color: 'text.secondary' }}
                        />
                    </Box>
                </Box>
                <Tabs value={tabValue} onChange={handleChange} centered sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.2)' }}>
                    <Tab label="Agronomy Overview" icon={<Agriculture />} iconPosition="start" />
                    <Tab label="Inputs & Soil" icon={<Science />} iconPosition="start" />
                    <Tab label="Protection & Risks" icon={<BugReport />} iconPosition="start" />
                    <Tab label="Media & Geospatial" icon={<ImageIcon />} iconPosition="start" />
                </Tabs>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                {/* 1. Agronomy Overview */}
                <CustomTabPanel value={tabValue} index={0}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'primary.light' }}>Crop Profile</Typography>
                                <InfoRow label="Crop Type" value={observation.crop_information?.crop_type} />
                                <InfoRow label="Variety" value={observation.crop_information?.variety} />
                                <InfoRow label="Growth Stage" value={observation.crop_information?.crop_stage} />
                                <InfoRow label="Ratoon Number" value={observation.crop_information?.ratoon_number} />
                                <InfoRow label="Planting Date" value={observation.crop_information?.planting_date} />
                                <InfoRow label="Exp. Harvest" value={observation.crop_information?.expected_harvest_date} />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'warning.light' }}>Health & Monitoring</Typography>
                                <InfoRow label="Canopy Cover" value={`${observation.crop_monitoring?.canopy_cover}%`} />
                                <InfoRow label="Crop Vigor" value={observation.crop_monitoring?.crop_vigor} />
                                <InfoRow label="Stress Level" value={observation.crop_monitoring?.stress} />
                                <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary" display="block">REMARKS</Typography>
                                    <Typography variant="body2">{observation.crop_monitoring?.remarks || 'No specific remarks recorded.'}</Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </CustomTabPanel>

                {/* 2. Inputs & Soil */}
                <CustomTabPanel value={tabValue} index={1}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, mb: 3 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'info.light' }}>Irrigation Data</Typography>
                                <InfoRow label="Soil Moisture" value={`${observation.irrigation_management?.soil_moisture_percentage}%`} icon={<WaterDrop fontSize="small" />} />
                                <InfoRow label="Volume Applied" value={`${observation.irrigation_management?.irrigation_volume} L`} />
                                <InfoRow label="Method" value={observation.irrigation_management?.irrigation_type} />
                                <InfoRow label="Water Source" value={observation.irrigation_management?.water_source} />
                            </Paper>
                            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'secondary.light' }}>Nutrient Application</Typography>
                                <InfoRow label="Fertilizer Type" value={observation.nutrient_management?.fertilizer_type} icon={<Science fontSize="small" />} />
                                <InfoRow label="Application Rate" value={`${observation.nutrient_management?.application_rate} kg/ha`} />
                                <InfoRow label="NPK Ratio" value={observation.nutrient_management?.npk_ratio} />
                                <InfoRow label="Application Date" value={observation.nutrient_management?.application_date} />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'success.light' }}>Soil Characteristics</Typography>
                                <InfoRow label="Soil Type" value={observation.soil_characteristics?.soil_type} icon={<Grass fontSize="small" />} />
                                <InfoRow label="Texture" value={observation.soil_characteristics?.soil_texture} />
                                <InfoRow label="pH Level" value={observation.soil_characteristics?.soil_ph} />
                                <InfoRow label="Organic Matter" value={`${observation.soil_characteristics?.organic_matter}%`} />
                                <InfoRow label="Drainage Class" value={observation.soil_characteristics?.drainage_class} />
                            </Paper>
                        </Grid>
                    </Grid>
                </CustomTabPanel>

                {/* 3. Protection */}
                <CustomTabPanel value={tabValue} index={2}>
                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2, mb: 3 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'error.light' }}>Pests & Diseases</Typography>
                                <InfoRow label="Pest Detected" value={observation.crop_protection?.pest_type || 'None'} />
                                <InfoRow label="Pest Severity" value={observation.crop_protection?.pest_severity} />
                                <Divider sx={{ my: 1 }} />
                                <InfoRow label="Disease" value={observation.crop_protection?.disease_type || 'None'} />
                                <InfoRow label="Disease Severity" value={observation.crop_protection?.disease_severity} />
                                <Divider sx={{ my: 1 }} />
                                <InfoRow label="Weeds" value={observation.crop_protection?.weed_type || 'None'} />
                                <InfoRow label="Weed Level" value={observation.crop_protection?.weed_level} />
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ color: 'info.light' }}>Control Measures</Typography>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Pest Control</Typography>
                                    <Typography variant="body1">{observation.control_methods?.pest_control || 'None applied'}</Typography>
                                </Box>
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Disease Control</Typography>
                                    <Typography variant="body1">{observation.control_methods?.disease_control || 'None applied'}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" color="text.secondary">Weed Control</Typography>
                                    <Typography variant="body1">{observation.control_methods?.weed_control || 'None applied'}</Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </CustomTabPanel>

                {/* 4. Media & Geo */}
                <CustomTabPanel value={tabValue} index={3}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Field Images</Typography>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                {observation.images?.length ? (
                                    observation.images.map((img, i) => (
                                        <Box
                                            key={i}
                                            component="img"
                                            src={img.image_url}
                                            sx={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}
                                        />
                                    ))
                                ) : (
                                    <Typography color="text.secondary">No images captured for this observation.</Typography>
                                )}
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" fontWeight={700} gutterBottom>Geospatial Context</Typography>
                            <Box sx={{ height: 300, width: '100%', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <MapContainer
                                    center={[observation.latitude, observation.longitude]}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                    zoomControl={false}
                                >
                                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                                    <CircleMarker
                                        center={[observation.latitude, observation.longitude]}
                                        radius={8}
                                        pathOptions={{ color: 'white', fillColor: '#4caf50', fillOpacity: 0.8 }}
                                    />
                                </MapContainer>
                            </Box>
                            <Box sx={{ mt: 2, display: 'flex', gap: 4 }}>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">LATITUDE</Typography>
                                    <Typography variant="body2" fontWeight={700}>{observation.latitude}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">LONGITUDE</Typography>
                                    <Typography variant="body2" fontWeight={700}>{observation.longitude}</Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">ACCURACY</Typography>
                                    <Typography variant="body2" fontWeight={700}>{observation.gps_accuracy}m</Typography>
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </CustomTabPanel>
            </DialogContent>

            <DialogActions sx={{ p: 3, bgcolor: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Close View</Button>
                <Button variant="contained" onClick={() => onGenerateReport(observation)}>
                    Download Report PDF
                </Button>
            </DialogActions>
        </Dialog>
    );
};
