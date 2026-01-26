import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    AppBar,
    Box,
    Toolbar,
    Typography,
    Button,
    Avatar,
    IconButton,
    Menu,
    MenuItem,
    Container,
    Tooltip,
} from '@mui/material';
import {
    Home as HomeIcon,
    Dashboard as DashboardIcon,
    Visibility as ObservationsIcon,
    Map as MapIcon,
    BarChart as AnalyticsIcon,
    Logout as LogoutIcon,
    Menu as MenuIcon,
    NaturePeople as LogoIcon,
    Group as UsersIcon,
    DarkModeOutlined,
    LightModeOutlined,
} from '@mui/icons-material';
import { useColorMode } from '../contexts/ThemeContext';

const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Observations', icon: <ObservationsIcon />, path: '/observations' },
    { text: 'Map View', icon: <MapIcon />, path: '/map' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Field Management', icon: <LogoIcon />, path: '/fields' },
    { text: 'User Management', icon: <UsersIcon />, path: '/users', adminOnly: true },
];

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { mode, toggleColorMode } = useColorMode();

    // Mobile Menu State
    const [anchorElNav, setAnchorElNav] = useState(null);
    const [anchorElUser, setAnchorElUser] = useState(null);

    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };
    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleLogout = () => {
        handleCloseUserMenu();
        logout();
        navigate('/login');
    };

    const handleNavigation = (path) => {
        navigate(path);
        handleCloseNavMenu();
    };

    const filteredMenuItems = menuItems.filter(item => {
        if (item.adminOnly) {
            return user?.role === 'ADMIN';
        }
        return true;
    });

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar
                position="fixed"
                elevation={0}
                className="glass-effect"
                sx={{
                    bgcolor: mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.7)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    backdropFilter: 'blur(10px)',
                    color: 'text.primary',
                }}
            >
                <Container maxWidth="xl">
                    <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 80 } }}>
                        {/* DESKTOP LOGO */}
                        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', mr: 4 }}>
                            <Box
                                sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '12px',
                                    bgcolor: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mr: 1.5,
                                    boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                <LogoIcon sx={{ color: 'white', fontSize: 24 }} />
                            </Box>
                            <Typography
                                variant="h6"
                                noWrap
                                component={Link}
                                to="/"
                                sx={{
                                    fontWeight: 800,
                                    letterSpacing: '-0.02em',
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    fontSize: '1.25rem'
                                }}
                            >
                                CROP<span style={{ color: '#10B981' }}>MONITOR</span>
                            </Typography>
                        </Box>

                        {/* MOBILE MENU MODAL */}
                        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                            <IconButton
                                size="large"
                                onClick={handleOpenNavMenu}
                                color="inherit"
                                sx={{ color: 'text.primary' }}
                            >
                                <MenuIcon />
                            </IconButton>
                            <Menu
                                id="menu-appbar"
                                anchorEl={anchorElNav}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                keepMounted
                                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                open={Boolean(anchorElNav)}
                                onClose={handleCloseNavMenu}
                                sx={{ display: { xs: 'block', md: 'none' } }}
                                PaperProps={{
                                    sx: { borderRadius: 3, mt: 1.5, minWidth: 200, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
                                }}
                            >
                                {filteredMenuItems.map((item) => (
                                    <MenuItem key={item.text} onClick={() => handleNavigation(item.path)} sx={{ py: 1.5 }}>
                                        <Box sx={{ mr: 2, display: 'flex', color: location.pathname === item.path ? 'primary.main' : 'text.secondary' }}>
                                            {item.icon}
                                        </Box>
                                        <Typography fontWeight={location.pathname === item.path ? 700 : 500}>
                                            {item.text}
                                        </Typography>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>

                        {/* MOBILE LOGO */}
                        <Box sx={{ display: { xs: 'flex', md: 'none' }, flexGrow: 1, alignItems: 'center' }}>
                            <LogoIcon sx={{ mr: 1, color: 'primary.main' }} />
                            <Typography
                                variant="h6"
                                noWrap
                                component={Link}
                                to="/"
                                sx={{
                                    fontWeight: 700,
                                    color: 'text.primary',
                                    textDecoration: 'none',
                                    fontSize: '1.1rem'
                                }}
                            >
                                MONITOR
                            </Typography>
                        </Box>

                        {/* DESKTOP MENU ITEMS */}
                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 0.5 }}>
                            {filteredMenuItems.map((item) => {
                                const isSelected = location.pathname === item.path;
                                return (
                                    <Button
                                        key={item.text}
                                        onClick={() => handleNavigation(item.path)}
                                        startIcon={item.icon}
                                        sx={{
                                            color: isSelected ? 'primary.main' : 'text.secondary',
                                            fontWeight: isSelected ? 700 : 500,
                                            px: 2,
                                            py: 1,
                                            borderRadius: '12px',
                                            position: 'relative',
                                            '&:hover': {
                                                bgcolor: 'rgba(16, 185, 129, 0.04)',
                                                color: 'primary.main',
                                            },
                                            '&::after': isSelected ? {
                                                content: '""',
                                                position: 'absolute',
                                                bottom: 2,
                                                left: '20%',
                                                right: '20%',
                                                height: '3px',
                                                bgcolor: 'primary.main',
                                                borderRadius: '10px'
                                            } : {},
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        }}
                                    >
                                        {item.text}
                                    </Button>
                                );
                            })}
                        </Box>

                        {/* DARK MODE TOGGLE */}
                        <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
                            <IconButton
                                onClick={toggleColorMode}
                                sx={{
                                    mr: 1,
                                    bgcolor: mode === 'light' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.05)',
                                    borderRadius: 3,
                                    p: 1.2
                                }}
                            >
                                {mode === 'light' ? <DarkModeOutlined /> : <LightModeOutlined />}
                            </IconButton>
                        </Tooltip>

                        {/* USER SETTINGS */}
                        <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ display: { xs: 'none', lg: 'block' }, textAlign: 'right' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
                                    {user?.username || 'Field Manager'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                                    {user?.role || 'Staff'}
                                </Typography>
                            </Box>

                            <Tooltip title="Account settings">
                                <IconButton
                                    onClick={handleOpenUserMenu}
                                    sx={{
                                        p: '4px',
                                        border: '2px solid',
                                        borderColor: 'divider',
                                        '&:hover': { borderColor: 'primary.light' }
                                    }}
                                >
                                    <Avatar
                                        sx={{
                                            bgcolor: 'primary.main',
                                            width: 34,
                                            height: 34,
                                            fontSize: '0.9rem',
                                            fontWeight: 800,
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    >
                                        {user?.username?.charAt(0).toUpperCase() || 'A'}
                                    </Avatar>
                                </IconButton>
                            </Tooltip>
                            <Menu
                                sx={{ mt: '45px' }}
                                id="menu-appbar"
                                anchorEl={anchorElUser}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                keepMounted
                                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                open={Boolean(anchorElUser)}
                                onClose={handleCloseUserMenu}
                                PaperProps={{
                                    sx: { borderRadius: 3, minWidth: 180, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
                                }}
                            >
                                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: { lg: 'none' } }}>
                                    <Typography variant="subtitle2" fontWeight={700}>{user?.username}</Typography>
                                    <Typography variant="caption" color="text.secondary">{user?.role}</Typography>
                                </Box>
                                <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                                    <LogoutIcon sx={{ mr: 2, fontSize: 20, color: 'error.main' }} />
                                    <Typography fontWeight={600} color="error.main">Logout</Typography>
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            {/* MAIN CONTENT OFFSET */}
            <Box
                component="main"
                className="animate-fade-in"
                sx={{
                    flexGrow: 1,
                    pt: { xs: 10, md: 14 },
                    pb: 6,
                    px: { xs: 2, sm: 3, md: 4 }
                }}
            >
                {children}
            </Box>
        </Box>
    );
};

export default Layout;
