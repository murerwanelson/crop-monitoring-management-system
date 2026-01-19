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
} from '@mui/icons-material';

const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Observations', icon: <ObservationsIcon />, path: '/observations' },
    { text: 'Map View', icon: <MapIcon />, path: '/map' },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'Field Management', icon: <LogoIcon />, path: '/fields' },
];

const Layout = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppBar position="fixed" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
                <Container maxWidth="xl">
                    <Toolbar disableGutters>
                        {/* DESKTOP LOGO */}
                        <LogoIcon sx={{ display: { xs: 'none', md: 'flex' }, mr: 1, color: 'primary.main', fontSize: 32 }} />
                        <Typography
                            variant="h5"
                            noWrap
                            component={Link}
                            to="/"
                            sx={{
                                mr: 4,
                                display: { xs: 'none', md: 'flex' },
                                fontWeight: 800,
                                letterSpacing: '-0.5px',
                                color: 'primary.dark',
                                textDecoration: 'none',
                                alignItems: 'center',
                            }}
                        >
                            CROP MONITOR
                        </Typography>

                        {/* MOBILE MENU ITEMS */}
                        <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
                            <IconButton
                                size="large"
                                aria-label="account of current user"
                                aria-controls="menu-appbar"
                                aria-haspopup="true"
                                onClick={handleOpenNavMenu}
                                color="primary"
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
                            >
                                {menuItems.map((item) => (
                                    <MenuItem key={item.text} onClick={() => handleNavigation(item.path)}>
                                        <Typography textAlign="center">{item.text}</Typography>
                                    </MenuItem>
                                ))}
                            </Menu>
                        </Box>

                        {/* MOBILE LOGO */}
                        <LogoIcon sx={{ display: { xs: 'flex', md: 'none' }, mr: 1, color: 'primary.main' }} />
                        <Typography
                            variant="h6"
                            noWrap
                            component={Link}
                            to="/"
                            sx={{
                                mr: 2,
                                display: { xs: 'flex', md: 'none' },
                                flexGrow: 1,
                                fontWeight: 700,
                                color: 'primary.dark',
                                textDecoration: 'none',
                            }}
                        >
                            MONITOR
                        </Typography>

                        {/* DESKTOP MENU ITEMS - LEFT ALIGNED */}
                        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-start', ml: 4, gap: 1 }}>
                            {menuItems.map((item) => {
                                const isSelected = location.pathname === item.path;
                                return (
                                    <Button
                                        key={item.text}
                                        onClick={() => handleNavigation(item.path)}
                                        startIcon={item.icon}
                                        sx={{
                                            my: 2,
                                            color: isSelected ? 'primary.contrastText' : 'text.secondary',
                                            bgcolor: isSelected ? 'primary.main' : 'transparent',
                                            display: 'flex',
                                            fontWeight: isSelected ? 700 : 500,
                                            px: 2,
                                            borderRadius: 2,
                                            '&:hover': {
                                                bgcolor: isSelected ? 'primary.dark' : 'action.hover',
                                                color: isSelected ? 'white' : 'primary.main',
                                            },
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {item.text}
                                    </Button>
                                );
                            })}
                        </Box>

                        {/* USER SETTINGS */}
                        <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                    {user?.username || 'Admin User'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {user?.role || 'Field Manager'}
                                </Typography>
                            </Box>

                            <Tooltip title="Open settings">
                                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                                    <Avatar sx={{ bgcolor: 'secondary.main', color: 'white', fontWeight: 'bold' }}>
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
                            >
                                <MenuItem onClick={handleLogout}>
                                    <LogoutIcon sx={{ mr: 2, fontSize: 20, color: 'text.secondary' }} />
                                    <Typography textAlign="center">Logout</Typography>
                                </MenuItem>
                            </Menu>
                        </Box>
                    </Toolbar>
                </Container>
            </AppBar>

            {/* MAIN CONTENT OFFSET */}
            <Box component="main" sx={{ flexGrow: 1, pt: { xs: 8, md: 10 }, pb: 4 }}>
                {children}
            </Box>
        </Box>
    );
};

export default Layout;
