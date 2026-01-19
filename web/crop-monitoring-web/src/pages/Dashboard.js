import React, { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Container,
    Grid,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    Stack,
    Avatar,
    Paper,
    Divider,
    useTheme,
    alpha,
} from '@mui/material';
import {
    TrendingUp,
    Agriculture,
    WaterDrop,
    Timeline,
    BarChart as BarChartIcon,
    PieChart as PieChartIcon,
    Update,
} from '@mui/icons-material';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';
import { getDashboardStats, getMoistureTrends } from '../services/api';

const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#0EA5E9'];

const StatCard = ({ icon, label, value, color, description }) => {
    const theme = useTheme();
    return (
        <Card
            sx={{
                borderRadius: 4,
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: alpha(color, 0.1),
                bgcolor: '#FFFFFF',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'all 0.3s ease',
                    boxShadow: `0 20px 25px -5px ${alpha(color, 0.1)}, 0 10px 10px -5px ${alpha(color, 0.04)}`,
                },
            }}
        >
            <CardContent>
                <Stack direction="row" spacing={3} alignItems="center">
                    <Avatar
                        sx={{
                            bgcolor: alpha(color, 0.1),
                            color: color,
                            width: 56,
                            height: 56,
                            borderRadius: 3,
                        }}
                    >
                        {icon}
                    </Avatar>
                    <Box>
                        <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1 }}>
                            {label}
                        </Typography>
                        <Typography variant="h3" fontWeight={800} sx={{ color: '#1E293B', my: 0.5 }}>
                            {value}
                        </Typography>
                        {description && (
                            <Typography variant="caption" color="text.secondary">
                                {description}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </CardContent>
            {/* Subtle Background Accent */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    width: 100,
                    height: 100,
                    borderRadius: '50%',
                    bgcolor: alpha(color, 0.03),
                    zIndex: 0,
                }}
            />
        </Card>
    );
};

const ChartWrapper = ({ title, icon, children }) => (
    <Card sx={{ borderRadius: 4, height: '100%', p: 1 }}>
        <CardContent>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={4}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 32, height: 32 }}>{icon}</Avatar>
                <Typography variant="h6" fontWeight={700}>
                    {title}
                </Typography>
            </Stack>
            <Box sx={{ width: '100%', height: 380 }}>{children}</Box>
        </CardContent>
    </Card>
);

export default function Dashboard() {
    const theme = useTheme();
    const [stats, setStats] = useState(null);
    const [moisture, setMoisture] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [statsData, moistureData] = await Promise.all([
                    getDashboardStats(30),
                    getMoistureTrends(30),
                ]);

                setStats(statsData);
                setMoisture(
                    (moistureData || [])
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .map((d) => ({
                            date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                            moisture: parseFloat(d.avg_moisture).toFixed(1),
                        }))
                );
            } catch (err) {
                console.error('Dashboard load failed:', err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const growthStages = useMemo(() => stats?.growth_stages ?? [], [stats]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Stack spacing={2} alignItems="center">
                    <CircularProgress thickness={5} size={60} sx={{ color: 'primary.main' }} />
                    <Typography variant="h6" color="text.secondary" fontWeight={500}>
                        Cultivating your dashboard...
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
                        Analytics Dashboard
                    </Typography>
                    <Typography variant="h6" color="text.secondary" fontWeight={400}>
                        Real-time monitoring and field intelligence
                    </Typography>
                </Box>
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
                        Last updated: {new Date().toLocaleTimeString()}
                    </Typography>
                </Paper>
            </Stack>

            <Grid container spacing={4} mb={6}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Agriculture fontSize="large" />}
                        label="Total Fields"
                        value={stats?.total_fields || 0}
                        color={theme.palette.primary.main}
                        description="Active cultivated areas"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Timeline fontSize="large" />}
                        label="Observations"
                        value={stats?.total_observations || 0}
                        color={theme.palette.info.main}
                        description="Total reports collected"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<TrendingUp fontSize="large" />}
                        label="Recent Growth"
                        value={`+${stats?.observations_in_period || 0}`}
                        color={theme.palette.success.main}
                        description="New observations (30 days)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<WaterDrop fontSize="large" />}
                        label="Crop Diversity"
                        value={stats?.unique_crop_varieties || 0}
                        color={theme.palette.secondary.main}
                        description="Unique crop varieties"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                    <ChartWrapper title="Soil Moisture Trend" icon={<Timeline />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={moisture} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                    dx={-10}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        borderRadius: 12,
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="moisture"
                                    stroke={theme.palette.primary.main}
                                    strokeWidth={4}
                                    dot={{ r: 4, fill: theme.palette.primary.main, strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <ChartWrapper title="Growth Stages" icon={<PieChartIcon />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={growthStages}
                                    dataKey="count"
                                    nameKey="growth_stage"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={8}
                                >
                                    {growthStages.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} cornerRadius={4} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend layout="horizontal" align="center" verticalAlign="bottom" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <ChartWrapper title="Crop Varieties" icon={<BarChartIcon />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.crop_varieties || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="crop_variety"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 12 }}
                                    dx={-10}
                                />
                                <RechartsTooltip cursor={{ fill: alpha(theme.palette.primary.main, 0.05) }} />
                                <Bar
                                    dataKey="count"
                                    fill={theme.palette.primary.main}
                                    radius={[8, 8, 0, 0]}
                                    barSize={60}
                                >
                                    {(stats?.crop_varieties || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={alpha(theme.palette.primary.main, 1 - index * 0.1)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>
            </Grid>
        </Container>
    );
}
