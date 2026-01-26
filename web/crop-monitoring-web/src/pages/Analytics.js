import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Stack,
    Avatar,
    Paper,
    CircularProgress,
    Box,
    FormControl,
    Select,
    MenuItem,
    alpha,
    useTheme,
    Tabs,
    Tab,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress,
    Button,
    Divider
} from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { MapContainer, TileLayer, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    ScatterChart,
    Scatter,
} from 'recharts';
import {
    FilterList,
    Height,
    Grass,
    Update,
    Agriculture,
    Warning as WarningIcon,
    CheckCircle,
    Info as InfoIcon,
    ReportProblem,
    Speed,
    BugReport,
    Timeline,
    AssignmentLate
} from '@mui/icons-material';
import { getGrowthAnalysis, getFields, getInsights, getAdvancedAnalytics, getObservationsAnalytics } from '../services/api';

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapAutoResizer = () => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    }, [map]);
    return null;
};



const ChartWrapper = ({ title, icon, children, height = 350 }) => {
    const theme = useTheme();
    return (
        <Card sx={{
            borderRadius: '24px',
            height: '100%',
            p: 1,
            background: `rgba(255, 255, 255, 0.7)`,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
            transition: 'transform 0.3s ease, box-shadow 0.3s ease',
            '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: '0 12px 48px 0 rgba(31, 38, 135, 0.12)',
            }
        }}>
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" mb={4}>
                    <Box sx={{
                        p: 1.5,
                        borderRadius: '12px',
                        background: alpha(theme.palette.primary.main, 0.15),
                        color: theme.palette.primary.main,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.2)}`
                    }}>
                        {React.cloneElement(icon, { sx: { fontSize: 24 } })}
                    </Box>
                    <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.5px' }}>
                        {title}
                    </Typography>
                </Stack>
                <Box sx={{ width: '100%', height: height }}>{children}</Box>
            </CardContent>
        </Card>
    );
};

const InsightCard = ({ type, title, message, metric, trend }) => {
    const theme = useTheme();

    let color = theme.palette.info.main;
    let Icon = InfoIcon;
    let bgColor = alpha(theme.palette.info.main, 0.1);

    if (type === 'alert') {
        color = '#FF4D4C';
        Icon = ReportProblem;
        bgColor = alpha('#FF4D4C', 0.1);
    } else if (type === 'warning') {
        color = '#FFB800';
        Icon = WarningIcon;
        bgColor = alpha('#FFB800', 0.1);
    } else if (type === 'success') {
        color = '#00FF94';
        Icon = CheckCircle;
        bgColor = alpha('#00FF94', 0.1);
    }

    return (
        <Card sx={{
            borderRadius: '24px',
            height: '100%',
            background: `rgba(255, 255, 255, 0.7)`,
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                width: '6px',
                height: '100%',
                background: color
            }
        }}>
            <CardContent sx={{ p: 3 }}>
                <Stack direction="row" spacing={2.5} alignItems="flex-start">
                    <Avatar sx={{
                        bgcolor: bgColor,
                        color: color,
                        width: 48,
                        height: 48,
                        boxShadow: `0 0 15px ${alpha(color, 0.2)}`
                    }}>
                        <Icon sx={{ fontSize: 28 }} />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: '1px', textTransform: 'uppercase' }}>
                            {title}
                        </Typography>
                        <Typography variant="h3" fontWeight={900} my={0.5} sx={{ color: 'text.primary', letterSpacing: '-1px' }}>
                            {metric}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5, fontWeight: 500 }}>
                            {message}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
};

const Analytics = () => {
    const theme = useTheme();
    const [growthData, setGrowthData] = useState({ trends: [], fertilizer_stats: {} });
    const [insights, setInsights] = useState([]);
    const [fields, setFields] = useState([]);
    const [varieties, setVarieties] = useState(['All']);
    const [cropVariety, setCropVariety] = useState('All');
    const [selectedField, setSelectedField] = useState('All');
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [advancedStats, setAdvancedStats] = useState(null);
    const [rawObservations, setRawObservations] = useState([]);

    const loadAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const variety = cropVariety === 'All' ? null : cropVariety;
            const fieldId = selectedField === 'All' ? null : selectedField;

            const [growth, insightsData, advanced, rawData] = await Promise.all([
                getGrowthAnalysis(variety, fieldId),
                getInsights(30),
                getAdvancedAnalytics(30),
                getObservationsAnalytics()
            ]);

            setGrowthData(growth);
            setInsights(insightsData);
            setAdvancedStats(advanced);
            setRawObservations(rawData);
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    }, [cropVariety, selectedField]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const fieldsData = await getFields();
                setFields(fieldsData);
                const uniqueVarieties = Array.from(new Set(fieldsData.map(f => f.crop_variety).filter(Boolean)));
                setVarieties(['All', ...uniqueVarieties]);
            } catch (error) {
                console.error('Error fetching fields:', error);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        loadAnalytics();
    }, [loadAnalytics]);

    // Derived chart data
    const severityData = useMemo(() => {
        if (!advancedStats?.pest_distribution) return [];
        const { low_severity, med_severity, high_severity } = advancedStats.pest_distribution;
        return [
            { name: 'Low', value: low_severity || 0 },
            { name: 'Medium', value: med_severity || 0 },
            { name: 'High', value: high_severity || 0 }
        ];
    }, [advancedStats]);

    const threatData = useMemo(() => {
        if (!Array.isArray(advancedStats?.pest_distribution?.top_types)) return [];
        return advancedStats.pest_distribution.top_types
            .filter(type => typeof type.count === 'number')
            .map(type => ({ pest_type: type.pest_type, count: type.count }));
    }, [advancedStats]);

    const hotspotData = useMemo(() => {
        if (!Array.isArray(advancedStats?.pest_distribution?.hotspots)) return [];
        return advancedStats.pest_distribution.hotspots
            .filter(hotspot => typeof hotspot.avg_affected === 'number' && hotspot.avg_affected > 0)
            .map(hotspot => ({ field_id: hotspot.field_id, avg_affected: hotspot.avg_affected }));
    }, [advancedStats]);

    const fertilizerStats = useMemo(() => [
        { name: 'Fertilized', height: growthData.fertilizer_stats?.fertilized || 0 },
        { name: 'Unfertilized', height: growthData.fertilizer_stats?.unfertilized || 0 }
    ], [growthData]);

    const scatterData = useMemo(() => {
        return (rawObservations || []).map(obs => ({
            amount: obs.crop_management?.fertilizer_amount || 0,
            height: obs.crop_measurement?.crop_height_cm || 0,
            variety: obs.crop_variety
        })).filter(d => d.amount > 0 && d.height > 0);
    }, [rawObservations]);

    if (loading && !growthData.trends.length) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Stack spacing={2} alignItems="center">
                    <CircularProgress thickness={5} size={60} sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" color="text.secondary" fontWeight={500}>
                        Analyzing seasonal data...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.default, 1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            py: 6
        }}>
            <Container maxWidth="xl">
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-end' }} mb={6} spacing={2}>
                    <Box>
                        <Typography variant="h3" fontWeight={800} color="text.primary" gutterBottom>
                            Advanced Analytics
                        </Typography>
                        <Typography variant="h6" color="text.secondary" fontWeight={400}>
                            In-depth performance monitoring and trend forecasting
                        </Typography>
                    </Box>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
                        <Paper
                            elevation={0}
                            sx={{
                                px: 2,
                                py: 0.5,
                                borderRadius: 3,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                width: { xs: '100%', sm: 'auto' }
                            }}
                        >
                            <FilterList color="action" fontSize="small" />
                            <FormControl variant="standard" sx={{ minWidth: 120 }}>
                                <Select
                                    value={cropVariety}
                                    onChange={(e) => setCropVariety(e.target.value)}
                                    disableUnderline
                                    sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                                >
                                    {varieties.map((v) => (
                                        <MenuItem key={v} value={v}>{v}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Paper>

                        <Paper
                            elevation={0}
                            sx={{
                                px: 2,
                                py: 0.5,
                                borderRadius: 3,
                                bgcolor: 'background.paper',
                                border: '1px solid',
                                borderColor: 'divider',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                width: { xs: '100%', sm: 'auto' }
                            }}
                        >
                            <Agriculture color="action" fontSize="small" />
                            <FormControl variant="standard" sx={{ minWidth: 120 }}>
                                <Select
                                    value={selectedField}
                                    onChange={(e) => setSelectedField(e.target.value)}
                                    disableUnderline
                                    sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                                >
                                    <MenuItem value="All">All Fields</MenuItem>
                                    {fields.map(field => (
                                        <MenuItem key={field.id} value={field.field_id}>{field.field_id}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Paper>

                        <Paper
                            elevation={0}
                            sx={{
                                px: 2,
                                py: 1,
                                borderRadius: 3,
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                border: '1px solid',
                                borderColor: alpha(theme.palette.primary.main, 0.1),
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                width: { xs: '100%', sm: 'auto' },
                                justifyContent: 'center'
                            }}
                        >
                            <Update fontSize="small" color="primary" />
                            <Typography variant="body2" fontWeight={600} color="primary.dark">
                                Refreshed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                        </Paper>
                    </Stack>
                </Stack>

                {/* Insights Section */}
                {insights.length > 0 && (
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        {insights.map((insight, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <InsightCard {...insight} />
                            </Grid>
                        ))}
                    </Grid>
                )}

                <Box sx={{
                    mb: 6,
                    display: 'flex',
                    justifyContent: 'center',
                    background: 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '20px',
                    p: 1,
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}>
                    <Tabs
                        value={tabValue}
                        onChange={(e, v) => setTabValue(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            '& .MuiTabs-indicator': {
                                height: '100%',
                                borderRadius: '16px',
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                zIndex: 0
                            },
                            '& .MuiTab-root': {
                                fontWeight: 800,
                                px: 4,
                                py: 2,
                                minHeight: 52,
                                zIndex: 1,
                                transition: 'color 0.3s',
                                textTransform: 'none',
                                fontSize: '0.9rem',
                                color: 'text.secondary',
                                '&.Mui-selected': { color: 'primary.main' }
                            }
                        }}
                    >
                        <Tab label="Overview" icon={<Speed />} iconPosition="start" />
                        <Tab label="Risks & Threats" icon={<BugReport />} iconPosition="start" />
                        <Tab label="Interventions" icon={<Grass />} iconPosition="start" />
                        <Tab label="Action Gaps" icon={<AssignmentLate />} iconPosition="start" />
                        <Tab label="Spatial Health" icon={<Timeline />} iconPosition="start" />
                        <Tab label="Raw Data Deep-Dive" icon={<Timeline />} iconPosition="start" />
                    </Tabs>
                </Box>

                {/* Tab 0: Overview */}
                {tabValue === 0 && (
                    <>
                        <Grid container spacing={4}>
                            {/* KPIs */}
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{
                                    borderRadius: '24px',
                                    textAlign: 'center',
                                    p: 3,
                                    height: '100%',
                                    background: `rgba(255, 255, 255, 0.7)`,
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
                                }}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} gutterBottom textTransform="uppercase" fontSize="0.7rem" letterSpacing="1px">Farm Health Index</Typography>
                                    <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
                                        <CircularProgress
                                            variant="determinate"
                                            value={advancedStats?.summary?.avg_health || 0}
                                            size={100}
                                            thickness={6}
                                            color={advancedStats?.summary?.avg_health > 70 ? 'success' : 'warning'}
                                            sx={{ strokeLinecap: 'round' }}
                                        />
                                        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Typography variant="h4" fontWeight={900}>{Math.round(advancedStats?.summary?.avg_health || 0)}</Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="caption" display="block" color="text.secondary" fontWeight={500}>Vigor & Moisture Composite</Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{
                                    borderRadius: '24px',
                                    p: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    background: `rgba(255, 255, 255, 0.7)`,
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
                                }}>
                                    <Stack spacing={2}>
                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} textTransform="uppercase" fontSize="0.7rem" letterSpacing="1px">Fertilizer Coverage</Typography>
                                        <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-1px' }}>{advancedStats?.fertilizer_coverage?.fertilized_fields} <Typography component="span" variant="h5" color="text.secondary">/ {advancedStats?.fertilizer_coverage?.total_fields}</Typography></Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={(advancedStats?.fertilizer_coverage?.fertilized_fields / advancedStats?.fertilizer_coverage?.total_fields) * 100}
                                            sx={{ height: 8, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.1), '& .MuiLinearProgress-bar': { borderRadius: 4 } }}
                                        />
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>Fields optimized this period</Typography>
                                    </Stack>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{
                                    borderRadius: '24px',
                                    p: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    background: `rgba(255, 255, 255, 0.7)`,
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                                    borderLeft: '8px solid',
                                    borderLeftColor: advancedStats?.pest_distribution?.high_severity > 0 ? '#FF4D4D' : '#00FF94'
                                }}>
                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} textTransform="uppercase" fontSize="0.7rem" letterSpacing="1px">Current Risk Level</Typography>
                                        <Typography variant="h3" fontWeight={900} color={advancedStats?.pest_distribution?.high_severity > 0 ? '#FF4D4D' : '#00FF94'} sx={{ letterSpacing: '-1px' }}>
                                            {advancedStats?.pest_distribution?.high_severity > 0 ? 'CRITICAL' : 'STABLE'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>{advancedStats?.pest_distribution?.pest_present} active threat detections</Typography>
                                    </Stack>
                                </Card>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Card sx={{
                                    borderRadius: '24px',
                                    p: 3,
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    background: advancedStats?.action_gaps?.length > 0 ? `rgba(255, 77, 77, 0.05)` : `rgba(255, 255, 255, 0.7)`,
                                    backdropFilter: 'blur(20px)',
                                    border: '1px solid rgba(255, 255, 255, 0.3)',
                                    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
                                }}>
                                    <Stack spacing={1}>
                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} textTransform="uppercase" fontSize="0.7rem" letterSpacing="1px">Urgent Responses</Typography>
                                        <Typography variant="h3" fontWeight={900} color={advancedStats?.action_gaps?.length > 0 ? '#FF4D4D' : '#00FF94'} sx={{ letterSpacing: '-1px' }}>
                                            {advancedStats?.action_gaps?.length || 0}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>Pending field interventions</Typography>
                                    </Stack>
                                </Card>
                            </Grid>

                        </Grid>

                        <Box sx={{ width: '100%', mt: 4 }}>
                            {/* Field Health Ranking */}
                            <ChartWrapper title="Strategic Health Ranking" icon={<Speed />}>
                                <TableContainer sx={{
                                    borderRadius: '16px',
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    overflow: 'hidden'
                                }}>
                                    <Table>
                                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>FIELD ID ENTITY</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>VITALITY SCORE</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>OPERATIONAL STATUS</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, color: 'text.secondary', py: 2 }}>ACTION CENTER</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {advancedStats?.health_scores?.map((field) => (
                                                <TableRow
                                                    key={field.field_id}
                                                    sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) }, transition: 'background 0.2s' }}
                                                >
                                                    <TableCell sx={{ fontWeight: 700, py: 2.5 }}>{field.field_id}</TableCell>
                                                    <TableCell sx={{ py: 2.5 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={field.score}
                                                                sx={{
                                                                    width: 140,
                                                                    height: 8,
                                                                    borderRadius: 4,
                                                                    bgcolor: alpha(field.score > 70 ? '#00FF94' : field.score > 40 ? '#FFB800' : '#FF4D4D', 0.1),
                                                                    '& .MuiLinearProgress-bar': { borderRadius: 4, background: field.score > 70 ? '#00FF94' : field.score > 40 ? '#FFB800' : '#FF4D4D' }
                                                                }}
                                                            />
                                                            <Typography variant="body2" fontWeight={800}>{field.score}%</Typography>
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ py: 2.5 }}>
                                                        <Chip
                                                            label={field.status}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 900,
                                                                fontSize: '0.65rem',
                                                                bgcolor: alpha(field.score > 70 ? '#00FF94' : field.score > 40 ? '#FFB800' : '#FF4D4D', 0.1),
                                                                color: field.score > 70 ? '#00CC76' : field.score > 40 ? '#E5A500' : '#FF2D2D',
                                                                border: 'none',
                                                                px: 1
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ py: 2.5 }}>
                                                        <Button
                                                            variant="text"
                                                            size="small"
                                                            sx={{ fontWeight: 800, color: 'primary.main', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}
                                                        >
                                                            ANALYZE CASE
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </ChartWrapper>
                        </Box>
                    </>
                )}

                {/* Tab 1: Risks - PROFESSIONALIZED LAYOUT */}
                {tabValue === 1 && (
                    <Stack spacing={6}>
                        {/* Top Summary Section */}
                        <Card sx={{
                            borderRadius: '32px',
                            p: 5,
                            background: `rgba(255, 255, 255, 0.7)`,
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
                        }}>
                            <Typography variant="h5" fontWeight={900} mb={4} sx={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'text.primary' }}>
                                Current Risk Status
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 2,
                                    justifyContent: 'space-between',
                                    alignItems: 'stretch',
                                    '@media (max-width: 600px)': {
                                        flexDirection: 'column',
                                    },
                                }}
                            >
                                <Box sx={{ flex: 1, minWidth: '200px', textAlign: 'center' }}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>Overall Risk Level</Typography>
                                    <Typography variant="h3" fontWeight={900} color={advancedStats?.pest_distribution?.high_severity > 0 ? '#FF4D4D' : '#00FF94'}>
                                        {advancedStats?.pest_distribution?.high_severity > 0 ? 'High' : 'Low'}
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: '200px', textAlign: 'center' }}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>Affected Fields</Typography>
                                    <Typography variant="h3" fontWeight={900} color="text.primary">
                                        {advancedStats?.pest_distribution?.hotspots?.length || 0}
                                    </Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: '200px', textAlign: 'center' }}>
                                    <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>Most Common Threat</Typography>
                                    <Typography variant="h3" fontWeight={900} color="text.primary">
                                        {threatData.length > 0 ? threatData[0].pest_type : 'None'}
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>

                        {/* Severity Section */}
                        <Card sx={{
                            borderRadius: '32px',
                            p: 5,
                            background: `rgba(255, 255, 255, 0.7)`,
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
                        }}>
                            <Typography variant="h5" fontWeight={900} mb={4} sx={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'text.primary' }}>
                                Severity Breakdown
                            </Typography>
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 2,
                                    justifyContent: 'space-between',
                                    alignItems: 'stretch',
                                    '@media (max-width: 600px)': {
                                        flexDirection: 'column',
                                    },
                                }}
                            >
                                {severityData.map((severity, index) => (
                                    <Box key={index} sx={{ flex: 1, minWidth: '200px', textAlign: 'center' }}>
                                        <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>{severity.name}</Typography>
                                        <Typography variant="h3" fontWeight={900} color={severity.name === 'High' ? '#FF4D4D' : severity.name === 'Medium' ? '#FFB800' : '#00FF94'}>
                                            {severity.value}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {severity.name === 'High' ? 'Immediate action needed' : severity.name === 'Medium' ? 'Monitor closely' : 'No immediate risk'}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Card>

                        {/* Field-Level Risk Clarity */}
                        <Card sx={{
                            borderRadius: '32px',
                            p: 5,
                            background: `rgba(255, 255, 255, 0.7)`,
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
                        }}>
                            <Typography variant="h5" fontWeight={900} mb={4} sx={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'text.primary' }}>
                                Risk by Field
                            </Typography>
                            {hotspotData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={hotspotData.sort((a, b) => b.avg_affected - a.avg_affected)}>
                                        <XAxis dataKey="field_id" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                                        <YAxis hide />
                                        <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="avg_affected" radius={[10, 10, 0, 0]} barSize={40}>
                                            {hotspotData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.avg_affected > 20 ? '#FF4D4D' : '#00E0FF'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <Typography variant="body2" color="text.secondary" textAlign="center">No significant threats detected</Typography>
                            )}
                        </Card>

                        {/* Threat Types Explained */}
                        <Card sx={{
                            borderRadius: '32px',
                            p: 5,
                            background: `rgba(255, 255, 255, 0.7)`,
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
                        }}>
                            <Typography variant="h5" fontWeight={900} mb={4} sx={{ textTransform: 'uppercase', letterSpacing: '2px', color: 'text.primary' }}>
                                Top Threat Types
                            </Typography>
                            {threatData.length > 0 ? (
                                <Grid container spacing={4}>
                                    {threatData.map((threat, index) => (
                                        <Grid item xs={12} sm={6} md={4} key={index}>
                                            <Box textAlign="center">
                                                <Typography variant="subtitle2" color="text.secondary" fontWeight={700} mb={1}>{threat.pest_type}</Typography>
                                                <Typography variant="h3" fontWeight={900} color="text.primary">
                                                    {threat.count}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">Most common pest this week</Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Typography variant="body2" color="text.secondary" textAlign="center">No threats detected</Typography>
                            )}
                        </Card>
                    </Stack>
                )}

                {/* Tab 2: Interventions - INPUT PERFORMANCE */}
                {tabValue === 2 && (
                    <Grid container spacing={4}>
                        <Grid item xs={12}>
                            <Card sx={{
                                borderRadius: '32px',
                                mb: 4,
                                background: `rgba(255, 255, 255, 0.7)`,
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)'
                            }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Stack direction="row" spacing={2} alignItems="center" mb={4}>
                                        <Box sx={{ p: 1.5, borderRadius: '12px', background: alpha('#00E0FF', 0.1), color: '#00E0FF' }}>
                                            <AssignmentLate sx={{ fontSize: 24 }} />
                                        </Box>
                                        <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>
                                            Precision Input Optimization
                                        </Typography>
                                    </Stack>

                                    <Grid container spacing={4} mb={6}>
                                        <Grid item xs={12} sm={4}>
                                            <Box sx={{ p: 3, borderRadius: '24px', background: 'rgba(0,0,0,0.02)', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={900} letterSpacing="1px">PENETRATION</Typography>
                                                <Typography variant="h3" fontWeight={900} color="primary" sx={{ my: 1 }}>
                                                    {Math.round((advancedStats?.fertilizer_coverage?.fertilized_fields / advancedStats?.fertilizer_coverage?.total_fields) * 100 || 0)}%
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.secondary">Asset Coverage</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Box sx={{ p: 3, borderRadius: '24px', background: 'rgba(0,0,0,0.02)', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={900} letterSpacing="1px">INTENSITY</Typography>
                                                <Typography variant="h3" fontWeight={900} sx={{ my: 1 }}>
                                                    {parseFloat(advancedStats?.fertilizer_coverage?.avg_amount_overall || 0).toFixed(1)}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.secondary">Avg kg / Hectare</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <Box sx={{ p: 3, borderRadius: '24px', background: 'rgba(0,0,0,0.02)', textAlign: 'center', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <Typography variant="caption" color="text.secondary" fontWeight={900} letterSpacing="1px">DIVERSITY</Typography>
                                                <Typography variant="h3" fontWeight={900} sx={{ my: 1 }}>
                                                    {advancedStats?.fertilizer_coverage?.usage_by_type?.length || 0}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={600} color="text.secondary">Chemical Subsets</Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>

                                    <Grid container spacing={6}>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle2" fontWeight={900} color="text.secondary" mb={3} letterSpacing="1px">DISTRIBUTION BY CATEGORY</Typography>
                                            <ResponsiveContainer width="100%" height={250}>
                                                <BarChart data={advancedStats?.fertilizer_coverage?.usage_by_type || []} layout="vertical" margin={{ left: 20 }}>
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="fertilizer_type" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                                                    <Bar dataKey="count" fill="#00E0FF" radius={[0, 8, 8, 0]} barSize={20} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle2" fontWeight={900} color="text.secondary" mb={3} letterSpacing="1px">VOLUMETRIC PERFORMANCE</Typography>
                                            <TableContainer sx={{ borderRadius: '16px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <Table size="small">
                                                    <TableHead>
                                                        <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                                            <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>CHEMICAL TYPE</TableCell>
                                                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>AVG APP (KG)</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {advancedStats?.fertilizer_coverage?.usage_by_type?.map((row) => (
                                                            <TableRow key={row.fertilizer_type}>
                                                                <TableCell sx={{ fontWeight: 600 }}>{row.fertilizer_type || 'General'}</TableCell>
                                                                <TableCell align="right" sx={{ fontWeight: 800 }}>{parseFloat(row.avg_amount || 0).toFixed(1)}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <ChartWrapper title="Growth Response Delta" icon={<Height />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={fertilizerStats}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800 }} />
                                        <Bar dataKey="height" radius={[12, 12, 0, 0]} barSize={80}>
                                            {fertilizerStats.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#00FF94' : '#00E0FF'} fillOpacity={0.8} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartWrapper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <ChartWrapper title="Kinetic Correlation (Scatter)" icon={<Height />}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                        <XAxis type="number" dataKey="amount" name="Amount" hide />
                                        <YAxis type="number" dataKey="height" name="Height" hide />
                                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter data={scatterData}>
                                            {scatterData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill="#00E0FF" fillOpacity={0.6} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </ChartWrapper>
                        </Grid>
                    </Grid>
                )}

                {/* Tab 3: Action Gaps - CRITICAL COMMAND */}
                {tabValue === 3 && (
                    <Box sx={{ width: '100%' }}>
                        <Card sx={{
                            borderRadius: '32px',
                            background: `rgba(255, 255, 255, 0.7)`,
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                            width: '100%'
                        }}>
                            <CardContent sx={{ p: 4 }}>
                                <Stack direction="row" spacing={2} alignItems="center" mb={4}>
                                    <Box sx={{ p: 1.5, borderRadius: '12px', background: alpha('#FF4D4D', 0.1), color: '#FF4D4D' }}>
                                        <AssignmentLate sx={{ fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>Critical Intervention Hub</Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>ACTIONABLE OPERATIONAL ANOMALIES</Typography>
                                    </Box>
                                </Stack>

                                <TableContainer sx={{ borderRadius: '20px', border: '1px solid rgba(0,0,0,0.05)' }}>
                                    <Table sx={{ minWidth: 650 }}>
                                        <TableHead sx={{ bgcolor: alpha('#FF4D4D', 0.03) }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>FIELD ENTITY</TableCell>
                                                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>ANOMALY VECTOR</TableCell>
                                                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>THREAT LEVEL</TableCell>
                                                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>LOG DATE</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'text.secondary' }}>COMMAND CENTER</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {loading ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                                        <CircularProgress />
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Loading action gaps...</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ) : advancedStats?.action_gaps?.length > 0 ? (
                                                advancedStats.action_gaps.map((gap, idx) => (
                                                    <TableRow key={idx} sx={{ '&:hover': { bgcolor: alpha('#FF4D4D', 0.02) } }}>
                                                        <TableCell sx={{ fontWeight: 800 }}>{gap.field_id}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={gap.issue}
                                                                size="small"
                                                                sx={{
                                                                    fontWeight: 900,
                                                                    fontSize: '0.65rem',
                                                                    bgcolor: alpha(gap.issue.includes('Pest') ? '#FF4D4D' : '#FFB800', 0.1),
                                                                    color: gap.issue.includes('Pest') ? '#FF4D4D' : '#FFB800'
                                                                }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Tooltip title={gap.severity === 'High' ? 'High severity due to pest infestation' : 'Medium severity due to operational anomaly'}>
                                                                <Typography variant="body2" fontWeight={900} color={gap.severity === 'High' ? '#FF4D4D' : '#FFB800'}>
                                                                    {gap.severity}
                                                                </Typography>
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>{new Date(gap.date).toLocaleDateString()}</TableCell>
                                                        <TableCell align="right">
                                                            <Button
                                                                variant="contained"
                                                                size="small"
                                                                sx={{
                                                                    borderRadius: '10px',
                                                                    textTransform: 'none',
                                                                    fontWeight: 800,
                                                                    bgcolor: gap.issue.includes('Pest') ? '#FF4D4D' : 'primary.main',
                                                                    boxShadow: `0 4px 14px ${alpha(gap.issue.includes('Pest') ? '#FF4D4D' : theme.palette.primary.main, 0.4)}`,
                                                                    '&:hover': { bgcolor: gap.issue.includes('Pest') ? '#CC3D3D' : 'primary.dark' }
                                                                }}
                                                            >
                                                                {gap.issue.includes('Pest') ? 'INITIATE SPRAY' : 'ACTIVATE WATER'}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                                        <CheckCircle color="success" sx={{ fontSize: 40, mb: 1 }} />
                                                        <Typography variant="h6">No action gaps detected!</Typography>
                                                        <Typography variant="body2" color="text.secondary">No anomalies detected or data unavailable from the backend.</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {/* Tab 4: Spatial Health - Terrain Intelligence */}
                {tabValue === 4 && (
                    <Box sx={{ width: '100%', mb: 6 }}>
                        <Box sx={{ mb: 4, textAlign: 'center' }}>
                            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-1.5px', mb: 1 }}>Terrain Intelligence</Typography>
                            <Typography variant="body1" color="text.secondary" fontWeight={500}>High-fidelity spatial risk distribution and moisture mapping.</Typography>
                        </Box>

                        <Paper elevation={3} sx={{
                            height: '75vh',
                            width: '100%',
                            position: 'relative',
                            borderRadius: '32px',
                            overflow: 'hidden',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.15)',
                            border: '1px solid rgba(255,255,255,0.4)'
                        }}>
                            <MapContainer center={[-17.783, 31.060]} zoom={14} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                                <MapAutoResizer />
                                <TileLayer
                                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                    attribution='Tiles &copy; Esri'
                                />
                                {rawObservations.map((obs) => {
                                    if (!obs.gps_coordinates) return null;
                                    const pos = [obs.gps_coordinates.lat, obs.gps_coordinates.lng];

                                    const pestSeverity = obs.crop_management?.pest_severity;
                                    const moistureLevel = obs.computed_soil_status;

                                    let fillColor = '#00FF94'; // Success
                                    if (pestSeverity === 'High' || moistureLevel === 'Dry') fillColor = '#FF4D4D'; // Error
                                    else if (pestSeverity === 'Medium' || moistureLevel === 'Wet') fillColor = '#FFB800'; // Warning

                                    return (
                                        <Circle
                                            key={obs.id}
                                            center={pos}
                                            radius={40}
                                            pathOptions={{
                                                color: fillColor,
                                                fillColor: fillColor,
                                                fillOpacity: 0.7,
                                                weight: 3
                                            }}
                                        >
                                            <Popup>
                                                <Box sx={{ p: 2, minWidth: 240, borderRadius: '16px' }}>
                                                    <Typography variant="subtitle1" fontWeight={900} color="primary" sx={{ mb: 1 }}>{obs.field_id}</Typography>
                                                    <Stack spacing={1.5}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Typography variant="caption" fontWeight={800} color="text.secondary">PEST THREAT</Typography>
                                                            <Chip label={pestSeverity || 'Stable'} size="small" sx={{ fontWeight: 900, height: 20, fontSize: '0.6rem', bgcolor: alpha(fillColor, 0.1), color: fillColor }} />
                                                        </Box>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Typography variant="caption" fontWeight={800} color="text.secondary">SOIL STATUS</Typography>
                                                            <Typography variant="body2" fontWeight={700}>{moistureLevel}</Typography>
                                                        </Box>
                                                        <Divider />
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>Observed on {new Date(obs.observation_date).toLocaleDateString()}</Typography>
                                                    </Stack>
                                                </Box>
                                            </Popup>
                                        </Circle>
                                    );
                                })}
                            </MapContainer>

                            {/* Floating Glass Legend - Re-aligned to Left to match MapView reference */}
                            <Paper sx={{
                                position: 'absolute',
                                top: 30,
                                left: 30,
                                zIndex: 1000,
                                p: 3,
                                borderRadius: '24px',
                                background: 'rgba(255, 255, 255, 0.85)',
                                backdropFilter: 'blur(20px)',
                                border: '1px solid rgba(255, 255, 255, 0.5)',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                                minWidth: 200
                            }}>
                                <Typography variant="subtitle2" fontWeight={900} mb={2} sx={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' }}>Terrain Analysis Key</Typography>
                                <Stack spacing={2}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#FF4D4D', boxShadow: '0 0 10px #FF4D4D' }} />
                                        <Typography variant="body2" fontWeight={700}>Critical Risk / Stress</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#FFB800', boxShadow: '0 0 10px #FFB800' }} />
                                        <Typography variant="body2" fontWeight={700}>Observation Required</Typography>
                                    </Stack>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: '#00FF94', boxShadow: '0 0 10px #00FF94' }} />
                                        <Typography variant="body2" fontWeight={700}>Optimal Performance</Typography>
                                    </Stack>
                                </Stack>
                            </Paper>
                        </Paper>
                    </Box>
                )}

                {/* Tab 5: Raw Data Deep-Dive */}
                {tabValue === 5 && (
                    <Box sx={{ width: '100%' }}>
                        <Card sx={{
                            borderRadius: '32px',
                            background: `rgba(255, 255, 255, 0.7)`,
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                            width: '100%'
                        }}>
                            <CardContent sx={{ p: 4 }}>
                                <Stack direction="row" spacing={2} alignItems="center" mb={4}>
                                    <Box sx={{ p: 1.5, borderRadius: '12px', background: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                                        <Timeline sx={{ fontSize: 24 }} />
                                    </Box>
                                    <Box>
                                        <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '-0.5px' }}>Strategic Data Repository</Typography>
                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>GRANULAR VARIABLE ANALYSIS</Typography>
                                    </Box>
                                </Stack>

                                <TableContainer sx={{ borderRadius: '24px', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                    <Table sx={{ minWidth: 650 }}>
                                        <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                                            <TableRow>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem' }}>OBSERVATION ENTITY</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem' }}>KINETIC GROWTH</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem' }}>VIGOR INDEX</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem' }}>ENVIRONMENT STATUS</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem' }}>INPUT VECTOR</TableCell>
                                                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.7rem' }}>THREAT MATRIX</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rawObservations.slice(0, 15).map((obs) => (
                                                <TableRow key={obs.id} sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.01) } }}>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={800}>{obs.field_id}</Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={500}>{new Date(obs.observation_date).toLocaleDateString()}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>{obs.crop_measurement?.crop_height_cm} cm</Typography>
                                                        <Typography variant="caption" color="text.secondary">{obs.crop_measurement?.plant_population} u/ha</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={obs.crop_measurement?.vigor}
                                                            size="small"
                                                            sx={{
                                                                fontWeight: 900,
                                                                fontSize: '0.65rem',
                                                                bgcolor: alpha('#00FF94', 0.1),
                                                                color: '#00CC76'
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>{obs.crop_measurement?.soil_moisture}%</Typography>
                                                        <Typography variant="caption" color="text.secondary">{obs.crop_measurement?.soil_moisture_level}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>{obs.crop_management?.fertilizer_applied ? 'APPLIED' : 'NONE'}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{obs.crop_management?.fertilizer_type || 'N/A'}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700} color={obs.crop_management?.pest_present ? '#FF4D4D' : 'text.primary'}>
                                                            {obs.crop_management?.pest_present ? 'DETECTED' : 'CLEAR'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">{obs.crop_management?.pest_type || 'No threats'}</Typography>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </Container>
        </Box >
    );
};

export default Analytics;
