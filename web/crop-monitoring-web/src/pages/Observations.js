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
} from '@mui/material';
import {
    Visibility as ViewIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    FileDownload as ExportIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import {
    Drawer,
    ListItemText,
    Divider,
    Button,
    Grid,
} from '@mui/material';
import { getObservations, deleteObservation, getObservation } from '../services/api';
import { format } from 'date-fns';

const Observations = () => {
    const [observations, setObservations] = useState([]);
    const [filteredObservations, setFilteredObservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedObservation, setSelectedObservation] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

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

        const headers = ['Field ID', 'Collector', 'Variety', 'Growth Stage', 'Date', 'Height', 'Leaves', 'Population', 'Weather', 'Watering'];
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
            obs.crop_management?.watering || '-'
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
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                Observations
            </Typography>

            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                    fullWidth
                    placeholder="Search by crop variety, collector, or field ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    variant="outlined"
                    sx={{ flexGrow: 1 }}
                />
                <Button
                    variant="outlined"
                    startIcon={<ExportIcon />}
                    onClick={handleExportCSV}
                    sx={{ px: 3 }}
                >
                    Export CSV
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Field ID</TableCell>
                            <TableCell>Collector</TableCell>
                            <TableCell>Crop Variety</TableCell>
                            <TableCell>Growth Stage</TableCell>
                            <TableCell>Observation Date</TableCell>
                            <TableCell>Planting Date</TableCell>
                            <TableCell>Height (cm)</TableCell>
                            <TableCell>Moisture (%)</TableCell>
                            <TableCell>Fertilizer</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredObservations
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((obs) => (
                                <TableRow key={obs.id} hover>
                                    <TableCell>{obs.field_id}</TableCell>
                                    <TableCell>{obs.collector_name}</TableCell>
                                    <TableCell>{obs.crop_variety}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={obs.growth_stage}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {obs.observation_date
                                            ? format(new Date(obs.observation_date), 'MMM dd, yyyy')
                                            : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {obs.planting_date
                                            ? format(new Date(obs.planting_date), 'MMM dd, yyyy')
                                            : '-'}
                                    </TableCell>
                                    <TableCell>{obs.crop_height || '-'}</TableCell>
                                    <TableCell>{obs.soil_moisture || '-'}</TableCell>
                                    <TableCell>{obs.fertilizer_type || '-'}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={obs.synced ? 'Synced' : 'Not Synced'}
                                            size="small"
                                            color={obs.synced ? 'success' : 'warning'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" color="primary" onClick={() => handleViewDetails(obs.id)}>
                                            <ViewIcon />
                                        </IconButton>
                                        <IconButton size="small" color="default">
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDelete(obs.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredObservations.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>

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
                            <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
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
                        </Grid>

                        <Typography variant="h6" sx={{ mt: 4, mb: 1 }} fontWeight="700">Crop Measurements</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <ListItemText primary="Height" secondary={`${selectedObservation.crop_measurement?.crop_height_cm || 0} cm`} />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Leaves" secondary={selectedObservation.crop_measurement?.number_of_leaves || 0} />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Population" secondary={`${selectedObservation.crop_measurement?.plant_population || 0} /m²`} />
                            </Grid>
                            <Grid item xs={6}>
                                <ListItemText primary="Stalk Diameter" secondary={`${selectedObservation.crop_measurement?.stalk_diameter || 0} mm`} />
                            </Grid>
                        </Grid>

                        <Typography variant="h6" sx={{ mt: 4, mb: 1 }} fontWeight="700">Management Info</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="body2"><strong>Growth Stage:</strong> {selectedObservation.growth_stage}</Typography>
                        <Typography variant="body2"><strong>Weather:</strong> {selectedObservation.crop_management?.weather || 'N/A'}</Typography>
                        <Typography variant="body2"><strong>Watering:</strong> {selectedObservation.crop_management?.watering || 'N/A'}</Typography>
                        <Typography variant="body2"><strong>Fertilizer:</strong> {selectedObservation.crop_management?.fertilizer_applied ? selectedObservation.crop_management.fertilizer_type : 'None'}</Typography>
                        <Typography variant="body2"><strong>Pesticide:</strong> {selectedObservation.crop_management?.sprayed ? selectedObservation.crop_management.pesticide_used : 'None'}</Typography>

                        {selectedObservation.media_items && selectedObservation.media_items.length > 0 && (
                            <>
                                <Typography variant="h6" sx={{ mt: 4, mb: 1 }} fontWeight="700">Media</Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Grid container spacing={1}>
                                    {selectedObservation.media_items.map((item, idx) => (
                                        <Grid item xs={6} key={idx}>
                                            <Box
                                                component="img"
                                                src={item.image_url.startsWith('http') ? item.image_url : `http://10.72.49.103:8000${item.image_url}`}
                                                sx={{ width: '100%', borderRadius: 2, height: 120, objectFit: 'cover' }}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </>
                        )}

                        <Box sx={{ mt: 4 }}>
                            <Button fullWidth variant="contained" color="primary" onClick={() => setDrawerOpen(false)}>
                                Done
                            </Button>
                        </Box>
                    </Box>
                )}
            </Drawer>
        </Container>
    );
};

export default Observations;
