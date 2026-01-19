import React, { useState, useEffect, useMemo } from 'react';
import {
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    CircularProgress,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Avatar,
    Paper,
    useTheme,
    alpha,
    Divider,
} from '@mui/material';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    Cell,
} from 'recharts';
import {
    Insights,
    FilterList,
    Height,
    Grass,
    Waves,
    Groups,
    Update,
} from '@mui/icons-material';
import { getGrowthAnalysis, getMoistureTrends } from '../services/api';

const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#0EA5E9'];

const ChartWrapper = ({ title, icon, children, height = 350 }) => (
    <Card sx={{ borderRadius: 4, height: '100%', p: 1 }}>
        <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>{icon}</Avatar>
                <Typography variant="h6" fontWeight={700}>
                    {title}
                </Typography>
            </Stack>
            <Box sx={{ width: '100%', height: height }}>{children}</Box>
        </CardContent>
    </Card>
);

const Analytics = () => {
    const theme = useTheme();
    const [growthData, setGrowthData] = useState([]);
    const [moistureData, setMoistureData] = useState([]);
    const [cropVariety, setCropVariety] = useState('All');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, [cropVariety]);

    const loadAnalytics = async () => {
        setLoading(true);
        try {
            const variety = cropVariety === 'All' ? null : cropVariety;
            const [growth, moisture] = await Promise.all([
                getGrowthAnalysis(variety),
                getMoistureTrends(30),
            ]);
            setGrowthData(growth);
            setMoistureData(
                (moisture || []).map((item) => ({
                    date: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    moisture: parseFloat(item.avg_moisture).toFixed(1),
                }))
            );
        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fertilizerStats = useMemo(() => [
        { name: 'Fertilized', height: growthData.fertilizer_stats?.fertilized || 0 },
        { name: 'Unfertilized', height: growthData.fertilizer_stats?.unfertilized || 0 }
    ], [growthData]);

    if (loading) {
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
        <Container maxWidth="xl" sx={{ py: 6 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={6}>
                <Box>
                    <Typography variant="h3" fontWeight={800} color="#1E293B" gutterBottom>
                        Advanced Analytics
                    </Typography>
                    <Typography variant="h6" color="text.secondary" fontWeight={400}>
                        In-depth performance monitoring and trend forecasting
                    </Typography>
                </Box>

                <Stack direction="row" spacing={2} alignItems="center">
                    <Paper
                        elevation={0}
                        sx={{
                            px: 3,
                            py: 1,
                            borderRadius: 3,
                            bgcolor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                        }}
                    >
                        <FilterList color="action" />
                        <FormControl variant="standard" sx={{ minWidth: 150 }}>
                            <Select
                                value={cropVariety}
                                onChange={(e) => setCropVariety(e.target.value)}
                                disableUnderline
                                sx={{ fontWeight: 600 }}
                            >
                                <MenuItem value="All">All Varieties</MenuItem>
                                <MenuItem value="Maize">Maize</MenuItem>
                                <MenuItem value="Wheat">Wheat</MenuItem>
                                <MenuItem value="Soybeans">Soybeans</MenuItem>
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
                        }}
                    >
                        <Update fontSize="small" color="primary" />
                        <Typography variant="body2" fontWeight={600} color="primary.dark">
                            Refreshed: {new Date().toLocaleTimeString()}
                        </Typography>
                    </Paper>
                </Stack>
            </Stack>

            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <ChartWrapper title="Growth Performance by Stage" icon={<Height />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={growthData.trends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="growth_stage" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                                <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Legend layout="horizontal" align="center" verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                                <Bar dataKey="avg_height" name="Avg Height (cm)" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} />
                                <Bar dataKey="avg_leaves" name="Avg No. Leaves" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <ChartWrapper title="Moisture Saturation Trends" icon={<Waves />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={moistureData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                                <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="moisture" name="Average Moisture %" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#moistureGradient)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>

                <Grid item xs={12} md={8}>
                    <ChartWrapper title="Fertilizer Impact on Growth" icon={<Grass />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={fertilizerStats} margin={{ top: 10, right: 30, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                                <RechartsTooltip cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="height" name="Avg Height (cm)" radius={[8, 8, 0, 0]} barSize={80}>
                                    {fertilizerStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#F59E0B'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <ChartWrapper title="Population Density Index" icon={<Groups />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={growthData.trends || []} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="growth_stage" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dx={-10} />
                                <RechartsTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Line type="stepAfter" dataKey="avg_population" name="Avg Plant Population" stroke="#8B5CF6" strokeWidth={4} dot={{ r: 6, fill: '#8B5CF6', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default Analytics;
