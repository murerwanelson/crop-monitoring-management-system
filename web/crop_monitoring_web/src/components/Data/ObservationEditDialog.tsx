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

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>SOIL CHARACTERISTICS</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Soil Type"
                            value={formData.soil_characteristics?.soil_type || ''}
                            onChange={(e) => handleChange('soil_characteristics', 'soil_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Texture"
                            value={formData.soil_characteristics?.soil_texture || ''}
                            onChange={(e) => handleChange('soil_characteristics', 'soil_texture', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            type="number"
                            fullWidth
                            label="pH Level"
                            value={formData.soil_characteristics?.soil_ph || ''}
                            onChange={(e) => handleChange('soil_characteristics', 'soil_ph', parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            type="number"
                            fullWidth
                            label="Organic Matter (%)"
                            value={formData.soil_characteristics?.organic_matter || ''}
                            onChange={(e) => handleChange('soil_characteristics', 'organic_matter', parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Drainage Class"
                            value={formData.soil_characteristics?.drainage_class || ''}
                            onChange={(e) => handleChange('soil_characteristics', 'drainage_class', e.target.value)}
                        />
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>IRRIGATION MANAGEMENT</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Irrigation Type"
                            value={formData.irrigation_management?.irrigation_type || ''}
                            onChange={(e) => handleChange('irrigation_management', 'irrigation_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            type="date"
                            fullWidth
                            label="Date"
                            InputLabelProps={{ shrink: true }}
                            value={formData.irrigation_management?.irrigation_date || ''}
                            onChange={(e) => handleChange('irrigation_management', 'irrigation_date', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            type="number"
                            fullWidth
                            label="Volume (L)"
                            value={formData.irrigation_management?.irrigation_volume || ''}
                            onChange={(e) => handleChange('irrigation_management', 'irrigation_volume', parseFloat(e.target.value))}
                        />
                    </Grid>
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
                            label="Water Source"
                            value={formData.irrigation_management?.water_source || ''}
                            onChange={(e) => handleChange('irrigation_management', 'water_source', e.target.value)}
                        />
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>NUTRIENT MANAGEMENT</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Fertilizer Type"
                            value={formData.nutrient_management?.fertilizer_type || ''}
                            onChange={(e) => handleChange('nutrient_management', 'fertilizer_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            type="date"
                            fullWidth
                            label="Application Date"
                            InputLabelProps={{ shrink: true }}
                            value={formData.nutrient_management?.application_date || ''}
                            onChange={(e) => handleChange('nutrient_management', 'application_date', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            type="number"
                            fullWidth
                            label="Application Rate (kg/ha)"
                            value={formData.nutrient_management?.application_rate || ''}
                            onChange={(e) => handleChange('nutrient_management', 'application_rate', parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="NPK Ratio"
                            value={formData.nutrient_management?.npk_ratio || ''}
                            onChange={(e) => handleChange('nutrient_management', 'npk_ratio', e.target.value)}
                        />
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>CROP PROTECTION</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Weed Type"
                            value={formData.crop_protection?.weed_type || ''}
                            onChange={(e) => handleChange('crop_protection', 'weed_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            select
                            fullWidth
                            label="Weed Level"
                            value={formData.crop_protection?.weed_level || ''}
                            onChange={(e) => handleChange('crop_protection', 'weed_level', e.target.value)}
                        >
                            {['None', 'Low', 'Medium', 'High'].map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Pest Type"
                            value={formData.crop_protection?.pest_type || ''}
                            onChange={(e) => handleChange('crop_protection', 'pest_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            select
                            fullWidth
                            label="Pest Severity"
                            value={formData.crop_protection?.pest_severity || ''}
                            onChange={(e) => handleChange('crop_protection', 'pest_severity', e.target.value)}
                        >
                            {['None', 'Low', 'Medium', 'High'].map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Disease Type"
                            value={formData.crop_protection?.disease_type || ''}
                            onChange={(e) => handleChange('crop_protection', 'disease_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            select
                            fullWidth
                            label="Disease Severity"
                            value={formData.crop_protection?.disease_severity || ''}
                            onChange={(e) => handleChange('crop_protection', 'disease_severity', e.target.value)}
                        >
                            {['None', 'Low', 'Medium', 'High'].map((opt) => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 12 }}>
                        <TextField
                            fullWidth
                            label="Remarks"
                            multiline
                            rows={2}
                            value={formData.crop_protection?.remarks || ''}
                            onChange={(e) => handleChange('crop_protection', 'remarks', e.target.value)}
                        />
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>CONTROL METHODS</Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Weed Control"
                            value={formData.control_methods?.weed_control || ''}
                            onChange={(e) => handleChange('control_methods', 'weed_control', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Pest Control"
                            value={formData.control_methods?.pest_control || ''}
                            onChange={(e) => handleChange('control_methods', 'pest_control', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Disease Control"
                            value={formData.control_methods?.disease_control || ''}
                            onChange={(e) => handleChange('control_methods', 'disease_control', e.target.value)}
                        />
                    </Grid>
                </Grid>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 700 }}>HARVEST & RESIDUALS</Typography>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            type="date"
                            fullWidth
                            label="Harvest Date"
                            InputLabelProps={{ shrink: true }}
                            value={formData.harvest?.harvest_date || ''}
                            onChange={(e) => handleChange('harvest', 'harvest_date', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            type="number"
                            fullWidth
                            label="Yield (tons/ha)"
                            value={formData.harvest?.yield || ''}
                            onChange={(e) => handleChange('harvest', 'yield', parseFloat(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <TextField
                            fullWidth
                            label="Harvest Method"
                            value={formData.harvest?.harvest_method || ''}
                            onChange={(e) => handleChange('harvest', 'harvest_method', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Residue Type"
                            value={formData.residual_management?.residue_type || ''}
                            onChange={(e) => handleChange('residual_management', 'residue_type', e.target.value)}
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <TextField
                            fullWidth
                            label="Management Method"
                            value={formData.residual_management?.management_method || ''}
                            onChange={(e) => handleChange('residual_management', 'management_method', e.target.value)}
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
