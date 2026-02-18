import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Typography,
    IconButton,
    Chip,
    Stack,
    Tooltip,
    alpha,
    useTheme,
    TableSortLabel,
    CircularProgress
} from '@mui/material';
import {
    Visibility,
    Edit,
    Delete
} from '@mui/icons-material';
import { format } from 'date-fns';
import { FullObservation } from '@/types/database.types';

interface ObservationTableProps {
    observations: FullObservation[];
    onView: (obs: FullObservation) => void;
    onEdit: (obs: FullObservation) => void;
    onDelete: (id: string) => void;
    isAdmin: boolean;
}

type Order = 'asc' | 'desc';
type OrderBy = keyof FullObservation | 'date_recorded' | 'field_name';

export const ObservationTable: React.FC<ObservationTableProps> = ({
    observations,
    onView,
    onEdit,
    onDelete,
    isAdmin
}) => {
    const theme = useTheme();
    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<OrderBy>('date_recorded');

    const handleRequestSort = (property: OrderBy) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const getStressColor = (stress?: string) => {
        if (!stress) return 'default';
        const s = stress.toLowerCase();
        if (s === 'none' || s === 'optimal') return 'success';
        if (s.includes('water') || s.includes('nutrient')) return 'warning';
        return 'error';
    };

    // Sorting logic
    const sortedObservations = React.useMemo(() => {
        return [...observations].sort((a, b) => {
            let aValue: any = a[orderBy as keyof FullObservation];
            let bValue: any = b[orderBy as keyof FullObservation];

            if (orderBy === 'date_recorded') {
                aValue = new Date(a.date_recorded).getTime();
                bValue = new Date(b.date_recorded).getTime();
            }

            if (bValue < aValue) return order === 'asc' ? 1 : -1;
            if (bValue > aValue) return order === 'asc' ? -1 : 1;
            return 0;
        });
    }, [observations, order, orderBy]);

    return (
        <TableContainer component={Paper} sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: 2 }}>
            <Table sx={{ minWidth: 800 }}>
                <TableHead>
                    <TableRow>
                        <TableCell>
                            <TableSortLabel
                                active={orderBy === 'date_recorded'}
                                direction={orderBy === 'date_recorded' ? order : 'asc'}
                                onClick={() => handleRequestSort('date_recorded')}
                            >
                                Date Recorded
                            </TableSortLabel>
                        </TableCell>
                        <TableCell>Field Location</TableCell>
                        <TableCell>Crop Details</TableCell>
                        <TableCell>Monitoring</TableCell>
                        <TableCell>Inputs</TableCell>
                        <TableCell align="right">Actions</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedObservations.map((obs) => (
                        <TableRow key={obs.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                    {format(new Date(obs.date_recorded), 'MMM dd, yyyy')}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {format(new Date(obs.date_recorded), 'HH:mm')}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Typography variant="subtitle2" fontWeight={700}>{obs.field_name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {obs.section_name} • {obs.block_id}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Chip
                                    label={obs.crop_information?.crop_type || 'Unknown'}
                                    size="small"
                                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 600, mb: 0.5 }}
                                />
                                <Typography variant="caption" display="block">
                                    {obs.crop_information?.variety} ({obs.crop_information?.crop_stage})
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Tooltip title={`Canopy: ${obs.crop_monitoring?.canopy_cover}%`}>
                                        <CircularProgress
                                            variant="determinate"
                                            value={obs.crop_monitoring?.canopy_cover || 0}
                                            size={24}
                                            thickness={6}
                                            sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.grey[200], 0.2), borderRadius: '50%' }}
                                        />
                                    </Tooltip>
                                    <Chip
                                        label={obs.crop_monitoring?.stress || 'None'}
                                        size="small"
                                        color={getStressColor(obs.crop_monitoring?.stress)}
                                        variant="outlined"
                                        sx={{ fontWeight: 700 }}
                                    />
                                </Stack>
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption" display="block">
                                    <strong>Water:</strong> {obs.irrigation_management?.soil_moisture_percentage}%
                                </Typography>
                                {obs.nutrient_management?.fertilizer_type && (
                                    <Typography variant="caption" display="block">
                                        <strong>Nutrient:</strong> {obs.nutrient_management.fertilizer_type}
                                    </Typography>
                                )}
                            </TableCell>
                            <TableCell align="right">
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                    <Tooltip title="View Details">
                                        <IconButton size="small" onClick={() => onView(obs)} color="primary">
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit Record">
                                        <IconButton size="small" onClick={() => onEdit(obs)} color="info">
                                            <Edit fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    {isAdmin && (
                                        <Tooltip title="Delete Record">
                                            <IconButton
                                                size="small"
                                                onClick={() => {
                                                    console.log('Delete icon clicked for:', obs.id);
                                                    onDelete(obs.id);
                                                }}
                                                color="error"
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Stack>
                            </TableCell>
                        </TableRow>
                    ))}
                    {sortedObservations.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                                <Typography color="text.secondary">No observations found matching filters.</Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
};
