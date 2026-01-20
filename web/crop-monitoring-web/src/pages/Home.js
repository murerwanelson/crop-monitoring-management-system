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
    Stack,
    Divider,
    Menu,
    MenuItem,
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
    const [weather, setWeather] = useState({ temp: 28, city: 'Kakira', subtext: 'Uganda, East Africa', desc: 'Sunny', hum: 45 });
    const [anchorElNotifications, setAnchorElNotifications] = useState(null);
    const theme = useTheme();

    const handleOpenNotifications = (event) => {
        setAnchorElNotifications(event.currentTarget);
    };

    const handleCloseNotifications = () => {
        setAnchorElNotifications(null);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsData = await getDashboardStats(30);
                setStats(statsData);

                // Helper to set weather state
                const updateWeather = (data, isFallback = false) => {
                    setWeather({
                        temp: Math.round(data.main.temp),
                        city: data.name || (isFallback ? 'Kakira (Default)' : 'Unknown Location'),
                        subtext: isFallback ? 'Uganda, East Africa' : 'Current Location',
                        desc: data.weather[0].main,
                        hum: data.main.humidity,
                        loading: false
                    });
                };

                // Geolocation for weather
                console.log("Checking geolocation support...");
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(async (position) => {
                        console.log("Geolocation success:", position.coords.latitude, position.coords.longitude);
                        try {
                            const { latitude, longitude } = position.coords;
                            const weatherData = await getWeatherData({ lat: latitude, lon: longitude });
                            console.log("Weather data fetched:", weatherData);
                            updateWeather(weatherData);
                        } catch (geoErr) {
                            console.error('Geo weather fetch failed, falling back:', geoErr);
                            fallbackWeather();
                        }
                    }, (err) => {
                        console.error('Geolocation denied/error:', err.code, err.message);
                        fallbackWeather();
                    });
                } else {
                    console.log("Geolocation not supported by this browser.");
                    fallbackWeather();
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };

        const fallbackWeather = async () => {
            try {
                const weatherData = await getWeatherData({ city: 'Jinja,UG' });
                setWeather({
                    temp: Math.round(weatherData.main.temp),
                    city: 'Jinja (Default)',
                    desc: weatherData.weather[0].main,
                    hum: weatherData.main.humidity,
                    loading: false
                });
            } catch (wErr) {
                console.log('Using default weather state');
                setWeather(prev => ({ ...prev, loading: false }));
            }
        };

        fetchData();
    }, []);

    const WelcomeCard = () => (
        <Paper
            elevation={0}
            sx={{
                p: { xs: 4, md: 6 },
                borderRadius: 6,
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, #059669 100%)`,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -12px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            {/* Decorative background elements */}
            <Box sx={{ position: 'absolute', top: -40, right: -40, opacity: 0.15, transform: 'rotate(-15deg)' }}>
                <CropIcon sx={{ fontSize: 280 }} />
            </Box>
            <Box
                sx={{
                    position: 'absolute',
                    bottom: -60,
                    left: '20%',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
                    zIndex: 0
                }}
            />

            <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                    <Chip
                        label="System Operational"
                        size="small"
                        sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            color: 'white',
                            fontWeight: 700,
                            backdropFilter: 'blur(4px)',
                            border: '1px solid rgba(255,255,255,0.3)'
                        }}
                    />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                        V 2.0.4
                    </Typography>
                </Stack>

                <Typography variant="h2" fontWeight="800" gutterBottom sx={{ fontSize: { xs: '2.5rem', md: '3.5rem' }, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    Smart Agriculture <br />
                    <span style={{ color: '#A7F3D0' }}>Real-time Intelligence</span>
                </Typography>

                <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: '600px', mb: 5, fontWeight: 400, lineHeight: 1.6 }}>
                    Optimize your agricultural estate with precision GIS integration,
                    predictive growth analytics, and seamless data monitoring.
                </Typography>

                <Stack direction="row" spacing={2}>
                    <Button
                        component={Link}
                        to="/dashboard"
                        variant="contained"
                        sx={{
                            bgcolor: 'white',
                            color: 'primary.dark',
                            fontWeight: 800,
                            px: 4,
                            py: 1.5,
                            borderRadius: '14px',
                            '&:hover': { bgcolor: '#F0FDF4', transform: 'translateY(-2px)' },
                            transition: 'all 0.2s',
                        }}
                        endIcon={<ArrowIcon />}
                    >
                        Explore Analytics
                    </Button>
                    <Button
                        component={Link}
                        to="/map"
                        variant="outlined"
                        sx={{
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.4)',
                            fontWeight: 700,
                            px: 4,
                            borderRadius: '14px',
                            '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                        }}
                    >
                        Interactive Map
                    </Button>
                </Stack>
            </Box>
        </Paper>
    );

    const WeatherWidget = () => (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                borderRadius: 5,
                background: 'linear-gradient(180deg, #38BDF8 0%, #0284C7 100%)',
                color: 'white',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 15px 30px -10px rgba(14, 165, 233, 0.3)'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1.1 }}>{weather.city}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 500 }}>{weather.subtext || 'Checking location...'}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                    <SunIcon />
                </Avatar>
            </Box>

            <Box sx={{ my: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Typography variant="h2" fontWeight="800" sx={{ lineHeight: 1 }}>{weather.temp}</Typography>
                    <Typography variant="h5" sx={{ mt: 1, fontWeight: 700 }}>°C</Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.5, opacity: 0.9 }}>{weather.desc}</Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, bgcolor: 'rgba(0,0,0,0.1)', p: 1.5, borderRadius: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <RainIcon fontSize="small" sx={{ opacity: 0.8 }} />
                    <Typography variant="caption" fontWeight="700">{weather.hum}% Hum</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingUpIcon fontSize="small" sx={{ opacity: 0.8 }} />
                    <Typography variant="caption" fontWeight="700">Optimal</Typography>
                </Box>
            </Box>
        </Paper>
    );

    const StatCard = ({ title, value, icon, color, trend, trendColor = 'success' }) => (
        <Card
            sx={{
                height: '100%',
                borderRadius: 5,
                border: '1px solid',
                borderColor: 'rgba(0,0,0,0.05)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)'
                }
            }}
            elevation={0}
        >
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                    <Avatar
                        sx={{
                            bgcolor: `${color}10`,
                            color: color,
                            borderRadius: '12px',
                            width: 48,
                            height: 48,
                            boxShadow: `0 8px 16px -4px ${color}20`
                        }}
                    >
                        {icon}
                    </Avatar>
                    {trend && (
                        <Chip
                            label={trend}
                            size="small"
                            color={trendColor}
                            sx={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                borderRadius: '8px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        />
                    )}
                </Box>
                <Typography variant="h3" fontWeight="800" sx={{ mb: 0.5, color: 'text.primary', letterSpacing: '-0.02em' }}>
                    {value}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.75rem' }}>
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
                borderRadius: 5,
                textDecoration: 'none',
                color: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 2.5,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid rgba(0,0,0,0.05)',
                bgcolor: 'white',
                '&:hover': {
                    borderColor: color,
                    transform: 'translateY(-4px)',
                    boxShadow: `0 12px 20px -8px ${color}30`
                }
            }}
            elevation={0}
        >
            <Avatar sx={{ bgcolor: `${color}10`, color: color, width: 56, height: 56, borderRadius: '16px' }}>
                {icon}
            </Avatar>
            <Box>
                <Typography variant="h6" fontWeight="800" sx={{ color: 'text.primary' }}>{title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{desc}</Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton sx={{ bgcolor: 'rgba(0,0,0,0.03)', borderRadius: '10px' }}>
                <ArrowIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            </IconButton>
        </Paper>
    );

    return (
        <Container maxWidth="xl" sx={{ pb: 8 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 6 }}>
                <Box>
                    <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.02em' }}>Management Hub</Typography>
                    <Typography variant="subtitle1" color="text.secondary" fontWeight={500}>Welcome back. Here is what's happening today.</Typography>
                </Box>
                <Stack direction="row" spacing={2}>
                    <IconButton
                        onClick={handleOpenNotifications}
                        sx={{ bgcolor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', borderRadius: 3, p: 1.5 }}
                    >
                        <BellIcon sx={{ color: 'text.secondary' }} />
                    </IconButton>
                    <Menu
                        anchorEl={anchorElNotifications}
                        open={Boolean(anchorElNotifications)}
                        onClose={handleCloseNotifications}
                        PaperProps={{
                            sx: { mt: 1.5, borderRadius: 3, minWidth: 280, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }
                        }}
                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    >
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight={800}>Notifications</Typography>
                        </Box>
                        <MenuItem onClick={handleCloseNotifications} sx={{ py: 2, justifyContent: 'center' }}>
                            <Typography variant="body2" color="text.secondary" fontWeight={500}>No new notifications</Typography>
                        </MenuItem>
                    </Menu>

                    <Button
                        component={Link}
                        to="/dashboard"
                        variant="contained"
                        startIcon={<AddIcon />}
                        sx={{ borderRadius: 3, fontWeight: 700, px: 3 }}
                    >
                        New Entry
                    </Button>
                </Stack>
            </Stack>

            {/* Top Row: Welcome Highlight */}
            <Box sx={{ mb: 6 }}>
                <WelcomeCard />
            </Box>

            {/* Metrics Row: Grid for responsiveness */}
            <Grid container spacing={3} sx={{ mb: 6 }}>
                <Grid item xs={12} md={4} lg={2.4}>
                    <WeatherWidget />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <StatCard
                        title="Active Fields"
                        value={stats?.total_fields || 0}
                        icon={<FieldIcon />}
                        color={theme.palette.primary.main}
                        trend="+2 New"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <StatCard
                        title="Observations"
                        value={stats?.total_observations || 0}
                        icon={<ObservationIcon />}
                        color={theme.palette.secondary.main}
                        trend="Active"
                        trendColor="info"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <StatCard
                        title="Varieties"
                        value={stats?.unique_crop_varieties || 0}
                        icon={<CropIcon />}
                        color={theme.palette.success.main}
                        trend="Stable"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2.4}>
                    <StatCard
                        title="Plant Health"
                        value="94%"
                        icon={<SunIcon />}
                        color="#F59E0B"
                        trend="Good"
                    />
                </Grid>
            </Grid>

            {/* Core Workflow Section */}
            <Box sx={{ mb: 8 }}>
                <Typography variant="h5" fontWeight="800" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 24, bgcolor: 'primary.main', borderRadius: 4 }} />
                    Interactive Guidelines
                </Typography>
                <Grid container spacing={3}>
                    {[
                        { step: '01', title: 'Define Boundaries', desc: 'Map your fields using GIS tools to establish precise cultivation areas.', icon: <MapIcon /> },
                        { step: '02', title: 'Collect Insights', desc: 'Record biometric data from the field to track growth and soil health.', icon: <PointerIcon /> },
                        { step: '03', title: 'Sync Remotely', desc: 'Our offline-first mobile engine ensures your data is always safe.', icon: <SyncIcon /> },
                        { step: '04', title: 'Drive Decisions', desc: 'Leverage analytics to optimize fertilizer use and yield predictions.', icon: <TrendingUpIcon /> }
                    ].map((item, idx) => (
                        <Grid item xs={12} sm={6} md={3} key={idx}>
                            <Paper sx={{
                                p: 4,
                                height: '100%',
                                borderRadius: 5,
                                position: 'relative',
                                border: '1px solid rgba(0,0,0,0.05)',
                                transition: 'all 0.3s',
                                '&:hover': { bgcolor: 'white', boxShadow: '0 12px 24px -8px rgba(0,0,0,0.08)' }
                            }} elevation={0}>
                                <Typography variant="h4" sx={{
                                    fontWeight: 900,
                                    color: 'rgba(16, 185, 129, 0.1)',
                                    position: 'absolute',
                                    top: 16,
                                    right: 24,
                                    lineHeight: 1
                                }}>{item.step}</Typography>
                                <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.main', mb: 3, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>
                                    {item.icon}
                                </Avatar>
                                <Typography variant="h6" fontWeight="800" gutterBottom>{item.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, fontWeight: 500 }}>
                                    {item.desc}
                                </Typography>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Quick Actions Row */}
            <Box>
                <Typography variant="h5" fontWeight="800" sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 8, height: 24, bgcolor: 'secondary.main', borderRadius: 4 }} />
                    Quick Access
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <ActionCard
                            title="New Observation"
                            desc="Log field data now"
                            icon={<AddIcon />}
                            to="/dashboard"
                            color={theme.palette.primary.main}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <ActionCard
                            title="Field Intelligence"
                            desc="View interactive map"
                            icon={<MapIcon />}
                            to="/map"
                            color={theme.palette.secondary.main}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <ActionCard
                            title="Advanced Analytics"
                            desc="Review growth trends"
                            icon={<DashboardIcon />}
                            to="/dashboard"
                            color={theme.palette.info.main}
                        />
                    </Grid>
                </Grid>
            </Box>
        </Container>
    );
};

export default Home;
