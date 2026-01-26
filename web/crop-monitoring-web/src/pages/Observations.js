import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    IconButton,
    Chip,
    Box,
    CircularProgress,
    TextField,
    Drawer,
    ListItemText,
    Divider,
    Button,
    Grid,
    Card,
    CardContent,
    Stack,
    Tooltip,
} from '@mui/material';
import {
    Visibility as ViewIcon,
    Delete as DeleteIcon,
    FileDownload as ExportIcon,
    Close as CloseIcon,
    GridView as GridIcon,
    List as ListIcon,
    CalendarToday as DateIcon,
    Straighten as RulerIcon,
    Yard as PlantIcon,
} from '@mui/icons-material';
import { getObservations, deleteObservation, getObservation } from '../services/api';
import { format } from 'date-fns';
import FieldMapHeader from '../components/FieldMapHeader';

const Observations = () => {
    const [observations, setObservations] = useState([]);
    const [filteredObservations, setFilteredObservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedObservation, setSelectedObservation] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // Default to grid to match user request

    useEffect(() => {
        loadObservations();
    }, []);

    useEffect(() => {
        const filtered = observations.filter(obs =>
            obs.crop_variety?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obs.collector_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            obs.field_id?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredObservations(filtered);
    }, [searchTerm, observations]);

    const loadObservations = async () => {
        try {
            const data = await getObservations();
            setObservations(data);
            setFilteredObservations(data);
        } catch (error) {
            console.error('Error loading observations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (id) => {
        try {
            const data = await getObservation(id);
            setSelectedObservation(data);
            setDrawerOpen(true);
        } catch (error) {
            console.error('Error fetching observation detail:', error);
            alert('Failed to load observation details');
        }
    };

    const handleExportCSV = () => {
        if (filteredObservations.length === 0) return;

        const headers = [
            'Field ID', 'Collector', 'Variety', 'Growth Stage', 'Date',
            'Height', 'Leaves', 'Population', 'Weather', 'Watering',
            'Urgent', 'Vigor', 'Moisture Level', 'Fertilizer Amt', 'Pest Present'
        ];
        const rows = filteredObservations.map(obs => [
            obs.field_id,
            obs.collector_name,
            obs.crop_variety,
            obs.growth_stage,
            obs.observation_date,
            obs.crop_height || '-',
            obs.crop_measurement?.number_of_leaves || '-',
            obs.crop_measurement?.plant_population || '-',
            obs.crop_management?.weather || '-',
            obs.crop_management?.watering || '-',
            obs.urgent_attention ? 'Yes' : 'No',
            obs.crop_measurement?.vigor || '-',
            obs.crop_measurement?.soil_moisture_level || '-',
            obs.crop_management?.fertilizer_amount || '-',
            obs.crop_management?.pest_present ? 'Yes' : 'No'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `observations_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this observation?')) {
            try {
                await deleteObservation(id);
                loadObservations();
            } catch (error) {
                console.error('Error deleting observation:', error);
                alert('Failed to delete observation');
            }
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
                <Box>
                    <Typography variant="h3" fontWeight="800" gutterBottom>
                        Observations List
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary">
                        Monitoring field health and growth metrics
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', p: 0.5 }}>
                        <Tooltip title="Grid View">
                            <IconButton
                                onClick={() => setViewMode('grid')}
                                color={viewMode === 'grid' ? 'primary' : 'default'}
                                sx={{ borderRadius: 2 }}
                            >
                                <GridIcon />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="List View">
                            <IconButton
                                onClick={() => setViewMode('list')}
                                color={viewMode === 'list' ? 'primary' : 'default'}
                                sx={{ borderRadius: 2 }}
                            >
                                <ListIcon />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                    <Button
                        variant="contained"
                        startIcon={<ExportIcon />}
                        onClick={handleExportCSV}
                        sx={{ borderRadius: 3, px: 4 }}
                    >
                        Export CSV
                    </Button>
                </Stack>
            </Stack>

            <Box sx={{ mb: 4 }}>
                <TextField
                    fullWidth
                    placeholder="Search by crop variety, collector, or field ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    variant="outlined"
                    sx={{
                        bgcolor: 'background.paper',
                        '& .MuiOutlinedInput-root': { borderRadius: 4 }
                    }}
                />
            </Box>

            {viewMode === 'list' ? (
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'action.hover' }}>
                                <TableCell sx={{ fontWeight: 700 }}>Field ID</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Collector</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Crop Variety</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Growth Stage</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredObservations
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((obs) => (
                                    <TableRow key={obs.id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{obs.field_id}</TableCell>
                                        <TableCell>{obs.collector_name}</TableCell>
                                        <TableCell>{obs.crop_variety}</TableCell>
                                        <TableCell>
                                            <Chip label={obs.growth_stage} size="small" color="primary" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            {obs.observation_date ? format(new Date(obs.observation_date), 'MMM dd, yyyy') : '-'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <IconButton size="small" color="primary" onClick={() => handleViewDetails(obs.id)}>
                                                    <ViewIcon fontSize="small" />
                                                </IconButton>
                                                <IconButton size="small" color="error" onClick={() => handleDelete(obs.id)}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Grid container spacing={3}>
                    {filteredObservations
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((obs) => (
                            <Grid item xs={12} sm={6} md={4} key={obs.id}>
                                <Card sx={{
                                    height: '100%',
                                    borderRadius: 5,
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
                                    }
                                }}>
                                    <Box sx={{ position: 'relative' }}>
                                        <FieldMapHeader
                                            boundary={obs.observation_area || obs.field_boundary}
                                        />
                                        {parseFloat(obs.soil_moisture) < 40 && (
                                            <Chip
                                                label="Needs Water"
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 16,
                                                    right: 16,
                                                    bgcolor: '#F59E0B',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                            />
                                        )}
                                        {obs.urgent_attention && (
                                            <Chip
                                                label="URGENT"
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 16,
                                                    left: 16,
                                                    bgcolor: '#DC2626',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    boxShadow: '0 4px 6px rgba(0,0,0,0.2)',
                                                    animation: 'pulse 2s infinite'
                                                }}
                                            />
                                        )}
                                    </Box>
                                    <CardContent sx={{ p: 3 }}>
                                        <Typography variant="h5" fontWeight="800" gutterBottom>
                                            {obs.field_id}
                                        </Typography>

                                        <Stack spacing={1} sx={{ mb: 3 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <PlantIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Crop:</strong> {obs.crop_variety || 'Unknown'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <DateIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Observed:</strong> {obs.observation_date ? format(new Date(obs.observation_date), 'MMMM dd, yyyy') : '-'}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <RulerIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Height:</strong> {obs.crop_height ? `${obs.crop_height} cm` : 'Not recorded'}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            onClick={() => handleViewDetails(obs.id)}
                                            sx={{
                                                borderRadius: 2,
                                                py: 1,
                                                fontWeight: 700,
                                                borderColor: 'primary.main',
                                                color: 'primary.main',
                                                '&:hover': {
                                                    bgcolor: 'primary.main',
                                                    color: 'white'
                                                }
                                            }}
                                        >
                                            View Details
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                </Grid>
            )}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <TablePagination
                    rowsPerPageOptions={[6, 12, 24]}
                    component="div"
                    count={filteredObservations.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Box>

            {/* Observation Detail Drawer */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', sm: 450 }, p: 3 } }}
            >
                {selectedObservation && (
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h5" fontWeight="800">Observation Details</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {selectedObservation.urgent_attention && (
                                    <Chip label="URGENT" color="error" size="small" sx={{ fontWeight: 'bold' }} />
                                )}
                                <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
                            </Box>
                        </Box>
                        <Divider sx={{ mb: 3 }} />

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Field ID</Typography>
                                <Typography variant="body1" fontWeight="bold">{selectedObservation.field_id}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Crop Variety</Typography>
                                <Typography variant="body1" fontWeight="bold">{selectedObservation.crop_variety}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Collector</Typography>
                                <Typography variant="body1">{selectedObservation.collector_name}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Date</Typography>
                                <Typography variant="body1">
                                    {selectedObservation.observation_date
                                        ? format(new Date(selectedObservation.observation_date), 'MMM dd, yyyy')
                                        : 'N/A'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">Planting Date</Typography>
                                <Typography variant="body1">
                                    {selectedObservation.planting_date
                                        ? format(new Date(selectedObservation.planting_date), 'MMM dd, yyyy')
                                        : 'N/A'}
                                </Typography>
                            </Grid>
                        </Grid>

                        <Typography variant="h6" sx={{ mt: 4, mb: 1 }} fontWeight="700">Crop Measurements</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <ListItemText primary="Height" secondary={`${selectedObservation.crop_measurement?.crop_height_cm || 0} cm`} />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Stalk Diameter" secondary={`${selectedObservation.crop_measurement?.stalk_diameter || 0} mm`} />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Leaves" secondary={selectedObservation.crop_measurement?.number_of_leaves || 0} />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Population" secondary={`${selectedObservation.crop_measurement?.plant_population || 0} /ha`} />
                            </Grid >
                            <Grid item xs={6}>
                                <ListItemText
                                    primary="Vigor"
                                    secondary={
                                        <Chip
                                            label={selectedObservation.crop_measurement?.vigor || 'N/A'}
                                            size="small"
                                            color={selectedObservation.crop_measurement?.vigor === 'Excellent' || selectedObservation.crop_measurement?.vigor === 'Good' ? 'success' : 'warning'}
                                            variant="outlined"
                                        />
                                    }
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Canopy Cover" secondary={`${selectedObservation.crop_measurement?.canopy_cover_percentage || 0}%`} />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Soil Moisture" secondary={selectedObservation.crop_measurement?.soil_moisture_level || 'N/A'} />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Weed Pressure" secondary={selectedObservation.crop_measurement?.weed_pressure || 'N/A'} />
                            </Grid>
                        </Grid >

                        <Typography variant="h6" sx={{ mt: 4, mb: 1 }} fontWeight="700">Management & Health</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="primary" fontWeight="bold">General</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2"><strong>Growth Stage:</strong> {selectedObservation.growth_stage}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2"><strong>Weather:</strong> {selectedObservation.crop_management?.weather || 'N/A'}</Typography>
                            </Grid>

                            <Grid item xs={12} sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" color="primary" fontWeight="bold">Inputs</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2"><strong>Watering:</strong> {selectedObservation.crop_management?.watering || 'None'}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="body2"><strong>Irrigation:</strong> {selectedObservation.crop_management?.irrigation_applied ? 'Applied' : 'None'}</Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="body2">
                                    <strong>Fertilizer:</strong> {selectedObservation.crop_management?.fertilizer_applied
                                        ? `${selectedObservation.crop_management.fertilizer_type} (${selectedObservation.crop_management.fertilizer_amount || 0} kg/ha)`
                                        : 'None'}
                                </Typography>
                            </Grid>

                            <Grid item xs={12} sx={{ mt: 1 }}>
                                <Typography variant="subtitle2" color={selectedObservation.crop_management?.pest_present ? "error" : "primary"} fontWeight="bold">Pests & Diseases</Typography>
                            </Grid>
                            {selectedObservation.crop_management?.pest_present ? (
                                <>
                                    <Grid item xs={6}>
                                        <Typography variant="body2"><strong>Type:</strong> {selectedObservation.crop_management.pest_type}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2"><strong>Severity:</strong> <span style={{ color: 'red' }}>{selectedObservation.crop_management.pest_severity}</span></Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2"><strong>Affected:</strong> {selectedObservation.crop_management.pest_percentage_affected}%</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2"><strong>Pesticide Used:</strong> {selectedObservation.crop_management.sprayed ? selectedObservation.crop_management.pesticide_used : 'No Spray'}</Typography>
                                    </Grid>
                                </>
                            ) : (
                                <Grid item xs={12}>
                                    <Typography variant="body2" color="text.secondary">No Record of Pests or Diseases</Typography>
                                </Grid>
                            )}
                        </Grid>

                        <Box sx={{ mt: 4 }}>
                            <Button fullWidth variant="contained" color="primary" onClick={() => setDrawerOpen(false)}>
                                Done
                            </Button>
                        </Box>
                    </Box >
                )}
            </Drawer >
        </Container >
    );
};

export default Observations;
