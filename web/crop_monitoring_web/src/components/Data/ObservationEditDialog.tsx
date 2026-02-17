import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    MenuItem,
    Typography,
    Box,
    Alert
} from '@mui/material';
import { FullObservation } from '@/types/database.types';

interface ObservationEditDialogProps {
    open: boolean;
    onClose: () => void;
    observation: FullObservation | null;
    onSave: (updatedObs: FullObservation) => Promise<void>;
}

export const ObservationEditDialog: React.FC<ObservationEditDialogProps> = ({
    open,
    onClose,
    observation,
    onSave
}) => {
    const [formData, setFormData] = useState<FullObservation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (observation) {
            setFormData(JSON.parse(JSON.stringify(observation))); // Deep copy
        }
    }, [observation]);

    const handleChange = (section: keyof FullObservation, field: string, value: any) => {
        if (!formData) return;

        setFormData(prev => {
            if (!prev) return null;
            // Handle top-level fields
            if (section === 'field_name' || section === 'section_name' || section === 'block_id') {
                return { ...prev, [field]: value };
            }
            // Handle nested fields
            return {
                ...prev,
                [section]: {
                    ...(prev[section] as any),
                    [field]: value
                }
            };
        });
    };

    const handleSubmit = async () => {
        if (!formData) return;
        setLoading(true);
        setError(null);
        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save changes');
        } finally {
            setLoading(false);
        }
    };

    if (!formData) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Edit Observation Record</DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>LOCATION</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Field Name"
                            value={formData.field_name}
                            onChange={(e) => handleChange('field_name', 'field_name', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Section"
                            value={formData.section_name}
                            onChange={(e) => handleChange('section_name', 'section_name', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Block ID"
                            value={formData.block_id}
                            onChange={(e) => handleChange('block_id', 'block_id', e.target.value)}
                        />
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>CROP INFORMATION</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Crop Type"
                            value={formData.crop_information?.crop_type || ''}
                            onChange={(e) => handleChange('crop_information', 'crop_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Variety"
                            value={formData.crop_information?.variety || ''}
                            onChange={(e) => handleChange('crop_information', 'variety', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            select
                            fullWidth
                            label="Growth Stage"
                            value={formData.crop_information?.crop_stage || ''}
                            onChange={(e) => handleChange('crop_information', 'crop_stage', e.target.value)}
                        >
                            {['Germination', 'Tillering', 'Grand Growth', 'Maturity', 'Harvesting'].map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>MONITORING</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            type="number"
                            fullWidth
                            label="Canopy Cover (%)"
                            value={formData.crop_monitoring?.canopy_cover || 0}
                            onChange={(e) => handleChange('crop_monitoring', 'canopy_cover', parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            select
                            fullWidth
                            label="Crop Vigor"
                            value={formData.crop_monitoring?.crop_vigor || ''}
                            onChange={(e) => handleChange('crop_monitoring', 'crop_vigor', e.target.value)}
                        >
                            {['Excellent', 'Good', 'Fair', 'Poor'].map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            select
                            fullWidth
                            label="Stress Level"
                            value={formData.crop_monitoring?.stress || ''}
                            onChange={(e) => handleChange('crop_monitoring', 'stress', e.target.value)}
                        >
                            {['None', 'Water', 'Nutrient', 'Pest', 'Disease'].map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>INPUTS (OPTIONAL)</Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            type="number"
                            fullWidth
                            label="Soil Moisture (%)"
                            value={formData.irrigation_management?.soil_moisture_percentage || 0}
                            onChange={(e) => handleChange('irrigation_management', 'soil_moisture_percentage', parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Fertilizer Type"
                            value={formData.nutrient_management?.fertilizer_type || ''}
                            onChange={(e) => handleChange('nutrient_management', 'fertilizer_type', e.target.value)}
                        />
                    </Grid>
                </Grid>

            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
