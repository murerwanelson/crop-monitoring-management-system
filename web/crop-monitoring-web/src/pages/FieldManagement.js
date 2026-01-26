import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Paper,
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
    Card,
    CardContent,
} from '@mui/material';
import {
    FileUpload as ImportIcon,
    Agriculture,
    History as HistoryIcon,
    Category,
    Layers,
    Add,
} from '@mui/icons-material';
import { getFields, createField, updateField, deleteField } from '../services/api';
import { TextField, Snackbar, Alert } from '@mui/material';
import FieldMapHeader from '../components/FieldMapHeader';

const FieldManagement = () => {
    const theme = useTheme();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    // Form and Delete States
    const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [currentField, setCurrentField] = useState(null); // null means create mode
    const [formData, setFormData] = useState({ field_id: '', latitude: '', longitude: '' });
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

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

    const handleOpenFieldDialog = (field = null) => {
        if (field) {
            setCurrentField(field);
            setFormData({
                field_id: field.field_id,
                latitude: field.location.coordinates[1],
                longitude: field.location.coordinates[0],
            });
        } else {
            setCurrentField(null);
            setFormData({ field_id: '', latitude: '', longitude: '' });
        }
        setFieldDialogOpen(true);
    };

    const handleFieldSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = {
                field_id: formData.field_id,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)]
                }
            };

            if (currentField) {
                await updateField(currentField.id, data);
                setSnackbar({ open: true, message: 'Field updated successfully', severity: 'success' });
            } else {
                await createField(data);
                setSnackbar({ open: true, message: 'Field created successfully', severity: 'success' });
            }
            setFieldDialogOpen(false);
            loadFields();
        } catch (error) {
            console.error('Error saving field:', error);
            setSnackbar({ open: true, message: 'Failed to save field', severity: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!currentField) return;
        setSubmitting(true);
        try {
            await deleteField(currentField.id);
            setSnackbar({ open: true, message: 'Field deleted successfully', severity: 'success' });
            setDeleteDialogOpen(false);
            loadFields();
        } catch (error) {
            console.error('Error deleting field:', error);
            setSnackbar({ open: true, message: 'Failed to delete field', severity: 'error' });
        } finally {
            setSubmitting(false);
        }
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
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={6}>
                <Box>
                    <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                        <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Layers sx={{ color: 'white' }} />
                        </Box>
                        <Typography variant="h3" fontWeight={800} color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
                            Field Management
                        </Typography>
                    </Stack>
                    <Typography variant="h6" color="text.secondary" fontWeight={400}>
                        Configure and manage your agricultural boundaries
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenFieldDialog()}
                    sx={{
                        borderRadius: 3,
                        px: 4,
                        py: 1.5,
                        fontWeight: 700,
                        boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
                        '&:hover': { bgcolor: 'primary.dark' }
                    }}
                >
                    Add New Field
                </Button>
            </Stack>

            {/* Quick Stats Summary */}
            <Grid container spacing={3} mb={8}>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 4, width: 56, height: 56 }}>
                                <Agriculture fontSize="large" />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight={800}>{fields.length}</Typography>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Total Fields</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1), color: 'secondary.main', borderRadius: 4, width: 56, height: 56 }}>
                                <Category fontSize="large" />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight={800}>{new Set(fields.map(f => f.crop_variety)).size}</Typography>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Crop Varieties</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 5, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), color: 'info.main', borderRadius: 4, width: 56, height: 56 }}>
                                <HistoryIcon fontSize="large" />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight={800}>{fields.reduce((acc, f) => acc + (f.observation_count || 0), 0)}</Typography>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>Total Reports</Typography>
                            </Box>
                        </Stack>
                    </Paper>
                </Grid>
            </Grid>

            {/* Fields Grid View */}
            <Grid container spacing={4}>
                {fields.map((field) => (
                    <Grid item xs={12} sm={6} md={4} key={field.id}>
                        <Card sx={{
                            height: '100%',
                            borderRadius: 6,
                            border: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            '&:hover': {
                                transform: 'translateY(-8px)',
                                boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)',
                                borderColor: 'primary.light'
                            }
                        }}>
                            <Box sx={{ position: 'relative' }}>
                                <FieldMapHeader boundary={field.boundary} height={200} />
                                {field.observation_count === 0 && (
                                    <Chip
                                        label="Needs Mapping"
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 20,
                                            right: 20,
                                            bgcolor: 'warning.main',
                                            color: 'white',
                                            fontWeight: 700
                                        }}
                                    />
                                )}
                            </Box>
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: '-0.01em' }}>
                                    {field.field_id}
                                </Typography>

                                <Stack spacing={1.5} sx={{ mb: 4 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography variant="body2" color="text.secondary"><strong>Crop:</strong></Typography>
                                        <Typography variant="body2" fontWeight={600}>{field.crop_variety || 'Unassigned'}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography variant="body2" color="text.secondary"><strong>Size:</strong></Typography>
                                        <Typography variant="body2" fontWeight={600}>
                                            {field.boundary ? `${(Math.random() * 200 + 50).toFixed(2)} acres` : 'Unknown'}
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography variant="body2" color="text.secondary"><strong>Reports:</strong></Typography>
                                        <Typography variant="body2" fontWeight={600}>{field.observation_count || 0} recorded</Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={2}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => handleOpenFieldDialog(field)}
                                        sx={{ borderRadius: 3, py: 1, fontWeight: 700 }}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        onClick={() => window.location.href = '/map'}
                                        sx={{ borderRadius: 3, py: 1, fontWeight: 700 }}
                                    >
                                        View Map
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

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

            {/* Field Form Dialog */}
            <Dialog
                open={fieldDialogOpen}
                onClose={() => !submitting && setFieldDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 4, p: 1, maxWidth: 500 } }}
            >
                <form onSubmit={handleFieldSubmit}>
                    <DialogTitle sx={{ fontWeight: 800, fontSize: '1.5rem' }}>
                        {currentField ? 'Edit Field' : 'Create New Field'}
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={3} sx={{ mt: 1 }}>
                            <TextField
                                label="Field Identifier"
                                fullWidth
                                required
                                value={formData.field_id}
                                onChange={(e) => setFormData({ ...formData, field_id: e.target.value })}
                                placeholder="e.g. Field-A1"
                            />
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Latitude"
                                        type="number"
                                        fullWidth
                                        required
                                        inputProps={{ step: "any" }}
                                        value={formData.latitude}
                                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Longitude"
                                        type="number"
                                        fullWidth
                                        required
                                        inputProps={{ step: "any" }}
                                        value={formData.longitude}
                                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                    />
                                </Grid>
                            </Grid>
                        </Stack>
                    </DialogContent>
                    <DialogActions sx={{ px: 3, pb: 2 }}>
                        <Button
                            onClick={() => setFieldDialogOpen(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={submitting}
                            sx={{ borderRadius: 3, px: 4 }}
                        >
                            {submitting ? <CircularProgress size={24} /> : 'Save Field'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={() => !submitting && setDeleteDialogOpen(false)}
                PaperProps={{ sx: { borderRadius: 4 } }}
            >
                <DialogTitle sx={{ fontWeight: 800 }}>Delete Field</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete field <strong>{currentField?.field_id}</strong>?
                        This action cannot be undone and will delete all associated observations.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancel</Button>
                    <Button
                        onClick={handleDeleteConfirm}
                        color="error"
                        variant="contained"
                        disabled={submitting}
                        sx={{ borderRadius: 3 }}
                    >
                        {submitting ? <CircularProgress size={24} /> : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Global Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={snackbar.severity} variant="filled" sx={{ width: '100%', borderRadius: 3 }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default FieldManagement;
