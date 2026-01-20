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
                borderRadius: 5,
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: alpha(color, 0.08),
                bgcolor: '#FFFFFF',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 24px 36px -8px ${alpha(color, 0.12)}, 0 12px 14px -8px ${alpha(color, 0.08)}`,
                    borderColor: alpha(color, 0.2),
                },
            }}
            elevation={0}
        >
            <CardContent sx={{ p: 4 }}>
                <Stack direction="row" spacing={3} alignItems="center">
                    <Avatar
                        sx={{
                            bgcolor: alpha(color, 0.08),
                            color: color,
                            width: 64,
                            height: 64,
                            borderRadius: 4,
                            boxShadow: `0 8px 16px -4px ${alpha(color, 0.2)}`
                        }}
                    >
                        {icon}
                    </Avatar>
                    <Box>
                        <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 1.5, fontSize: '0.7rem' }}>
                            {label}
                        </Typography>
                        <Typography variant="h3" fontWeight={800} sx={{ color: '#1E293B', my: 0.5, letterSpacing: '-0.02em' }}>
                            {value}
                        </Typography>
                        {description && (
                            <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                {description}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </CardContent>
            {/* Elegant Accent Decoration */}
            <Box
                sx={{
                    position: 'absolute',
                    top: -25,
                    right: -25,
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, ${alpha(color, 0.06)} 0%, transparent 70%)`,
                    zIndex: 0,
                }}
            />
        </Card>
    );
};

const ChartWrapper = ({ title, icon, children }) => {
    const theme = useTheme();
    return (
        <Card sx={{ borderRadius: 6, height: '100%', p: 2, border: '1px solid rgba(0,0,0,0.05)' }} elevation={0}>
            <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" mb={4}>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 40, height: 40, borderRadius: 3 }}>
                        {icon}
                    </Avatar>
                    <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '-0.01em' }}>
                        {title}
                    </Typography>
                </Stack>
                <Box sx={{ width: '100%', height: 380 }}>{children}</Box>
            </CardContent>
        </Card>
    );
};

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
                <Stack spacing={3} alignItems="center">
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                        <CircularProgress thickness={2} size={80} sx={{ color: 'rgba(16, 185, 129, 0.1)' }} variant="determinate" value={100} />
                        <CircularProgress
                            thickness={4}
                            size={80}
                            sx={{
                                color: 'primary.main',
                                position: 'absolute',
                                left: 0,
                                strokeLinecap: 'round',
                            }}
                        />
                        <Agriculture sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'primary.main', fontSize: 30 }} />
                    </Box>
                    <Typography variant="h6" color="text.secondary" fontWeight={600} sx={{ letterSpacing: '0.02em' }}>
                        CULTIVATING INSIGHTS...
                    </Typography>
                </Stack>
            </Box>
        );
    }

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'flex-end' }} mb={8} spacing={2}>
                <Box>
                    <Typography variant="h3" fontWeight={900} color="#1E293B" gutterBottom sx={{ letterSpacing: '-0.04em' }}>
                        Field Intelligence
                    </Typography>
                    <Typography variant="h6" color="text.secondary" fontWeight={500} sx={{ opacity: 0.8 }}>
                        Analytics monitoring & spatial growth trends
                    </Typography>
                </Box>
                <Paper
                    elevation={0}
                    sx={{
                        px: 2.5,
                        py: 1.5,
                        borderRadius: 4,
                        bgcolor: 'white',
                        border: '1px solid rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                    }}
                >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', animation: 'pulse 2s infinite' }} />
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                        Live Analytics
                    </Typography>
                    <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                    <Typography variant="caption" fontWeight={600} color="text.secondary">
                        Sync: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                </Paper>
            </Stack>

            <Grid container spacing={3} mb={6}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Agriculture sx={{ fontSize: 32 }} />}
                        label="Total Fields"
                        value={stats?.total_fields || 0}
                        color={theme.palette.primary.main}
                        description="Active crop area units"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Timeline sx={{ fontSize: 32 }} />}
                        label="Observations"
                        value={stats?.total_observations || 0}
                        color={theme.palette.info.main}
                        description="Satellite & field reports"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<TrendingUp sx={{ fontSize: 32 }} />}
                        label="Growth Index"
                        value={`+${stats?.observations_in_period || 0}`}
                        color={theme.palette.success.main}
                        description="New entries (30 days)"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<WaterDrop sx={{ fontSize: 32 }} />}
                        label="Diversity"
                        value={stats?.unique_crop_varieties || 0}
                        color={theme.palette.secondary.main}
                        description="Unique varieties tracked"
                    />
                </Grid>
            </Grid>

            <Grid container spacing={4}>
                <Grid item xs={12} lg={4}>
                    <ChartWrapper title="Soil Moisture Trends" icon={<Timeline />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={moisture} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }}
                                />
                                <RechartsTooltip
                                    cursor={{ stroke: theme.palette.primary.light, strokeWidth: 2 }}
                                    contentStyle={{
                                        borderRadius: 16,
                                        border: 'none',
                                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                                        padding: '12px 16px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="moisture"
                                    stroke={theme.palette.primary.main}
                                    strokeWidth={4}
                                    dot={{ r: 6, fill: '#fff', strokeWidth: 3, stroke: theme.palette.primary.main }}
                                    activeDot={{ r: 8, strokeWidth: 0, fill: theme.palette.primary.dark }}
                                    animationDuration={1500}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                    <ChartWrapper title="Growth Stage Distribution" icon={<PieChartIcon />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={growthStages}
                                    dataKey="count"
                                    nameKey="growth_stage"
                                    innerRadius={75}
                                    outerRadius={105}
                                    paddingAngle={6}
                                    stroke="none"
                                >
                                    {growthStages.map((_, i) => (
                                        <Cell
                                            key={i}
                                            fill={COLORS[i % COLORS.length]}
                                            sx={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}
                                        />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Legend
                                    layout="horizontal"
                                    align="center"
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    wrapperStyle={{ paddingTop: '20px', fontWeight: 600, fontSize: '12px' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </ChartWrapper>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                    <ChartWrapper title="Crop Variety Density" icon={<BarChartIcon />}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats?.crop_varieties || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="crop_variety"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 11, fontWeight: 700 }}
                                    dy={15}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: alpha(theme.palette.primary.main, 0.04) }}
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill={theme.palette.primary.main}
                                    radius={[10, 10, 0, 0]}
                                    barSize={45}
                                    animationDuration={2000}
                                >
                                    {(stats?.crop_varieties || []).map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={alpha(theme.palette.primary.main, 1 - index * 0.15)}
                                        />
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
