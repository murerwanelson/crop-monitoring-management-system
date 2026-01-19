import React, { useState, useEffect, useMemo } from 'react';
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
    IconButton,
    Box,
    Button,
    Grid,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Avatar,
    Chip,
    alpha,
    useTheme,
    Tooltip,
} from '@mui/material';
import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    FileUpload as ImportIcon,
    Map as MapIcon,
    Agriculture,
    History as HistoryIcon,
    Category,
    Layers,
    Add,
} from '@mui/icons-material';
import { getFields } from '../services/api';

const FieldManagement = () => {
    const theme = useTheme();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        loadFields();
    }, []);

    const loadFields = async () => {
        try {
            const data = await getFields();
            setFields(data);
        } catch (error) {
            console.error('Error loading fields:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleImport = async () => {
        if (!selectedFile) return;
        alert(`Importing ${selectedFile.name}... (Integration in progress)`);
        setImportDialogOpen(false);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Stack spacing={2} alignItems="center">
                    <CircularProgress thickness={5} size={50} color="primary" />
                    <Typography color="text.secondary" fontWeight={500}>Cataloging fields...</Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 6 }}>
            {/* Header Section */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={6}>
                <Box>
                    <Typography variant="h3" fontWeight={800} color="#1E293B" gutterBottom>
                        Field Management
                    </Typography>
                    <Typography variant="h6" color="text.secondary" fontWeight={400}>
                        Configure and manage your agricultural boundaries
                    </Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <Button
                        variant="outlined"
                        startIcon={<ImportIcon />}
                        onClick={() => setImportDialogOpen(true)}
                        sx={{ borderRadius: 3, px: 3, py: 1.2 }}
                    >
                        Bulk Import
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        sx={{ borderRadius: 3, px: 3, py: 1.2 }}
                    >
                        Create New Field
                    </Button>
                </Stack>
            </Stack>

            {/* Quick Stats Summary */}
            <Grid container spacing={3} mb={6}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'primary.main', borderRadius: 3, width: 48, height: 48 }}>
                                <Agriculture />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>Total Areas</Typography>
                                <Typography variant="h5" fontWeight={800}>{fields.length} Fields</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: alpha(theme.palette.secondary.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.secondary.main, 0.1) }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'secondary.main', borderRadius: 3, width: 48, height: 48 }}>
                                <Category />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="secondary.dark" fontWeight={700} sx={{ textTransform: 'uppercase' }}>Diversity</Typography>
                                <Typography variant="h5" fontWeight={800}>{new Set(fields.map(f => f.crop_variety)).size} Varieties</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: alpha(theme.palette.info.main, 0.05), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: 'info.main', borderRadius: 3, width: 48, height: 48 }}>
                                <HistoryIcon />
                            </Avatar>
                            <Box>
                                <Typography variant="caption" color="info.dark" fontWeight={700} sx={{ textTransform: 'uppercase' }}>Recent Activity</Typography>
                                <Typography variant="h5" fontWeight={800}>{fields.reduce((acc, f) => acc + (f.observation_count || 0), 0)} Reports</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Fields Table */}
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                            <TableCell sx={{ fontWeight: 700, color: '#64748B', py: 2.5 }}>IDENTIFIER</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748B', py: 2.5 }}>CROP VARIETY</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748B', py: 2.5 }}>GEOMETRY</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748B', py: 2.5 }}>OBSERVATIONS</TableCell>
                            <TableCell sx={{ fontWeight: 700, color: '#64748B', py: 2.5 }} align="right">ACTIONS</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {fields.map((field) => (
                            <TableRow key={field.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 700 }}>
                                            {field.field_id.charAt(0)}
                                        </Avatar>
                                        <Typography fontWeight={600} color="#1E293B">{field.field_id}</Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={field.crop_variety || 'Unassigned'}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            fontWeight: 600,
                                            color: field.crop_variety ? 'primary.main' : 'text.disabled',
                                            borderColor: field.crop_variety ? alpha(theme.palette.primary.main, 0.3) : '#E2E8F0',
                                            bgcolor: field.crop_variety ? alpha(theme.palette.primary.main, 0.02) : 'transparent'
                                        }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Layers fontSize="small" sx={{ color: field.boundary ? 'success.main' : 'warning.main' }} />
                                        <Typography variant="body2" color="text.secondary">
                                            {field.boundary ? 'Polygon Mapped' : 'Point Location'}
                                        </Typography>
                                    </Stack>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={700} color="text.primary">
                                        {field.observation_count || 0}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                        <Tooltip title="View on Map">
                                            <IconButton
                                                size="small"
                                                onClick={() => window.location.href = '/map'}
                                                sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}
                                            >
                                                <MapIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Edit Details">
                                            <IconButton size="small" sx={{ bgcolor: '#F8FAFC' }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete Field">
                                            <IconButton size="small" sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Import Dialog */}
            <Dialog
                open={importDialogOpen}
                onClose={() => setImportDialogOpen(false)}
                PaperProps={{
                    sx: { borderRadius: 4, p: 1, maxWidth: 500 }
                }}
            >
                <DialogTitle sx={{ fontWeight: 800, fontSize: '1.5rem', pb: 1 }}>Import GIS Boundary</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        Upload GeoJSON or KML files to update your field boundaries in bulk.
                        Agricultural mapping simplified.
                    </Typography>

                    <Box
                        sx={{
                            border: '2px dashed',
                            borderColor: alpha(theme.palette.primary.main, 0.2),
                            p: 6,
                            textAlign: 'center',
                            borderRadius: 4,
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                            cursor: 'pointer',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' }
                        }}
                        onClick={() => document.getElementById('import-file-input').click()}
                    >
                        <input
                            type="file"
                            accept=".geojson,.json,.kml"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            id="import-file-input"
                        />
                        <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mx: 'auto', mb: 2 }}>
                            <ImportIcon fontSize="large" />
                        </Avatar>
                        <Typography fontWeight={700} color="primary.dark">
                            {selectedFile ? selectedFile.name : 'Click to upload mapping data'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Supports .geojson, .json, and .kml
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setImportDialogOpen(false)} sx={{ color: 'text.secondary', fontWeight: 700 }}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleImport}
                        disabled={!selectedFile}
                        sx={{ borderRadius: 3, px: 4 }}
                    >
                        Process Data
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default FieldManagement;
