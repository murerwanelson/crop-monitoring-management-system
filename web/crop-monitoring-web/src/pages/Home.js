import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Grid,
    Card,
    CardContent,
    Button,
    Paper,
    IconButton,
    useTheme,
    Chip,
    Avatar,
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Map as MapIcon,
    AddCircleOutline as AddIcon,
    NaturePeople as CropIcon,
    WbSunny as SunIcon,
    Opacity as RainIcon,
    ArrowForward as ArrowIcon,
    NotificationsNone as BellIcon,
    TrendingUp as TrendingUpIcon,
    Grass as FieldIcon,
    Assignment as ObservationIcon,
    AdsClick as PointerIcon,
    CloudSync as SyncIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { getDashboardStats, getWeatherData } from '../services/api';

const Home = () => {
    const [stats, setStats] = useState(null);
    const [weather, setWeather] = useState({ temp: 28, city: 'Kakira', desc: 'Sunny', hum: 45 });
    const theme = useTheme();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await getDashboardStats(30);
                setStats(data);

                // Try to get real weather
                try {
                    const weatherData = await getWeatherData('Jinja,UG');
                    setWeather({
                        temp: Math.round(weatherData.main.temp),
                        city: 'Kakira Estate',
                        desc: weatherData.weather[0].main,
                        hum: weatherData.main.humidity
                    });
                } catch (wErr) {
                    console.log('Using fallback weather');
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };
        fetchData();
    }, []);

    const WelcomeCard = () => (
        <Paper
            elevation={0}
            sx={{
                p: 4,
                borderRadius: 4,
                background: `linear-gradient(120deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                <CropIcon sx={{ fontSize: 180 }} />
            </Box>

            <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Chip
                    label="System Operational"
                    size="small"
                    color="success"
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', mb: 2, fontWeight: 600 }}
                />
                <Typography variant="h4" fontWeight="800" gutterBottom>
                    Crop Monitoring System
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, maxWidth: '85%', mb: 3, lineHeight: 1.6 }}>
                    An advanced GIS-integrated management solution designed to optimize agricultural estate productivity.
                    Monitor field growth, track soil conditions, and generate yield predictions through real-time data collection and spatial analysis.
                </Typography>
                <Button
                    component={Link}
                    to="/dashboard"
                    variant="contained"
                    sx={{
                        bgcolor: 'white',
                        color: 'primary.main',
                        fontWeight: 'bold',
                        px: 3,
                        py: 1,
                        borderRadius: 2,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                    }}
                    endIcon={<ArrowIcon />}
                >
                    View Analytics
                </Button>
            </Box>
        </Paper>
    );

    const WeatherWidget = () => (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: 'info.light', // Fallback
                background: 'linear-gradient(180deg, #4FC3F7 0%, #29B6F6 100%)',
                color: 'white',
                height: '100%',
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="subtitle2" fontWeight="600">{weather.city}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Jinja, Uganda</Typography>
                </Box>
                <SunIcon />
            </Box>

            <Box sx={{ mt: 3, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                <Typography variant="h2" fontWeight="700">{weather.temp}°</Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>C</Typography>
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <RainIcon fontSize="small" sx={{ opacity: 0.8 }} />
                    <Typography variant="caption" fontWeight="600">{weather.hum}% Humidity</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingUpIcon fontSize="small" sx={{ opacity: 0.8 }} />
                    <Typography variant="caption" fontWeight="600">{weather.desc}</Typography>
                </Box>
            </Box>
        </Paper>
    );

    const StatCard = ({ title, value, icon, color, trend }) => (
        <Card sx={{ height: '100%', borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar sx={{ bgcolor: `${color}15`, color: color, borderRadius: 2 }}>
                        {icon}
                    </Avatar>
                    {trend && (
                        <Chip
                            label={trend}
                            size="small"
                            sx={{
                                height: 24,
                                bgcolor: 'success.light',
                                color: 'success.dark',
                                fontWeight: 'bold',
                                fontSize: '0.75rem'
                            }}
                        />
                    )}
                </Box>
                <Typography variant="h4" fontWeight="800" sx={{ mb: 0.5 }}>
                    {value}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                    {title}
                </Typography>
            </CardContent>
        </Card>
    );

    const ActionCard = ({ title, desc, icon, to, color }) => (
        <Paper
            component={Link}
            to={to}
            sx={{
                p: 3,
                borderRadius: 3,
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.2s',
                border: '1px solid transparent',
                '&:hover': {
                    bgcolor: 'background.paper',
                    borderColor: color,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 20px ${color}20`
                }
            }}
            elevation={0}
        >
            <Avatar sx={{ bgcolor: `${color}15`, color: color, width: 48, height: 48, borderRadius: 2 }}>
                {icon}
            </Avatar>
            <Box>
                <Typography variant="h6" fontWeight="bold">{title}</Typography>
                <Typography variant="caption" color="text.secondary">{desc}</Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <ArrowIcon sx={{ color: 'text.disabled' }} />
        </Paper>
    );

    return (
        <Container maxWidth="xl" sx={{ pb: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" fontWeight="800" color="text.primary">Dashboard Overview</Typography>
                    <Typography variant="body2" color="text.secondary">Real-time farm insights</Typography>
                </Box>
                <IconButton sx={{ bgcolor: 'white', boxShadow: 1 }}>
                    <BellIcon color="action" />
                </IconButton>
            </Box>

            {/* Top Row: Welcome */}
            <Box sx={{ mb: 4 }}>
                <WelcomeCard />
            </Box>

            {/* Metrics Row: Weather + 4 Stats */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
                gap: 2,
                mb: 4
            }}>
                <WeatherWidget />

                <StatCard
                    title="Active Fields"
                    value={stats?.total_fields || 0}
                    icon={<FieldIcon />}
                    color={theme.palette.primary.main}
                    trend="+2 this week"
                />

                <StatCard
                    title="Observations"
                    value={stats?.total_observations || 0}
                    icon={<ObservationIcon />}
                    color={theme.palette.secondary.main}
                    trend="+15 today"
                />

                <StatCard
                    title="Crop Varieties"
                    value={stats?.unique_crop_varieties || 0}
                    icon={<CropIcon />}
                    color={theme.palette.success.main}
                />

                <StatCard
                    title="Alerts"
                    value="3"
                    icon={<BellIcon />}
                    color={theme.palette.error.main}
                    trend="Action needed"
                />
            </Box>

            {/* Data Collection Guidance */}
            <Typography variant="h6" fontWeight="700" sx={{ mb: 2, mt: 4 }}>How to Collect Monitoring Data</Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[
                    { step: 1, title: 'Define Field', desc: 'Identify your field on the interactive map and define its GIS boundaries.', icon: <MapIcon /> },
                    { step: 2, title: 'Record Data', desc: 'Input crop height, population density, and current management activities.', icon: <PointerIcon /> },
                    { step: 3, title: 'Mobile Sync', desc: 'Use the mobile app for field-side capture and instant offline-first syncing.', icon: <SyncIcon /> },
                    { step: 4, title: 'Analyze Results', desc: 'Review automated growth trends and health alerts on your dashboard.', icon: <TrendingUpIcon /> }
                ].map((item, idx) => (
                    <Grid item xs={12} sm={6} md={3} key={idx}>
                        <Paper sx={{ p: 3, height: '100%', borderRadius: 3, position: 'relative', borderLeft: '4px solid', borderColor: 'primary.main' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                                <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    {item.step}
                                </Avatar>
                                <Typography variant="subtitle1" fontWeight="bold">{item.title}</Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                {item.desc}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Bottom Row: Actions */}
            <Typography variant="h6" fontWeight="700" sx={{ mb: 2 }}>Quick Access</Typography>
            <Grid container spacing={2}>
                <Grid item xs={4}>
                    <ActionCard
                        title="New Observation"
                        desc="Record data"
                        icon={<AddIcon />}
                        to="/dashboard"
                        color={theme.palette.primary.main}
                    />
                </Grid>
                <Grid item xs={4}>
                    <ActionCard
                        title="Field Map"
                        desc="View map"
                        icon={<MapIcon />}
                        to="/map"
                        color={theme.palette.secondary.main}
                    />
                </Grid>
                <Grid item xs={4}>
                    <ActionCard
                        title="Analytics"
                        desc="View trends"
                        icon={<DashboardIcon />}
                        to="/dashboard"
                        color={theme.palette.info.main}
                    />
                </Grid>
            </Grid>
        </Container>
    );
};

export default Home;
