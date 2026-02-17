import { useNavigate, useLocation } from 'react-router-dom'
import {
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    alpha,
    useTheme,
} from '@mui/material'
import {
    HomeOutlined,
    AnalyticsOutlined,
    DashboardOutlined,
    MapOutlined,
    AgricultureOutlined,
    VerifiedUserOutlined,
    LayersOutlined,
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'

const menuItems = [
    { path: '/', label: 'Home', icon: <HomeOutlined /> },
    { path: '/data', label: 'Field Records', icon: <AnalyticsOutlined /> },
    { path: '/dashboard', label: 'Performance', icon: <DashboardOutlined /> },
    { path: '/map', label: 'Geo-Intelligence', icon: <MapOutlined /> },
]

export function Navigation() {
    const navigate = useNavigate()
    const location = useLocation()
    const { user } = useAuth()
    const theme = useTheme()

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0f172a' }}>
            {/* Brand Header */}
            <Box sx={{ p: 4, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{
                        p: 1.2,
                        bgcolor: 'primary.main',
                        borderRadius: 2,
                        mr: 2,
                        display: 'flex',
                        boxShadow: `0 8px 16px ${alpha(theme.palette.primary.main, 0.4)}`
                    }}>
                        <AgricultureOutlined sx={{ fontSize: 28, color: 'white' }} />
                    </Box>
                    <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: '1px', color: 'white' }}>
                        CROP MONITOR
                    </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 700, opacity: 0.8 }}>
                    PRECISION AGRICULTURE v2.0
                </Typography>
            </Box>

            <List sx={{ px: 2, flexGrow: 1 }}>
                {menuItems.map((item) => {
                    const active = location.pathname === item.path
                    return (
                        <ListItem key={item.path} disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                onClick={() => navigate(item.path)}
                                sx={{
                                    borderRadius: 3,
                                    py: 1.5,
                                    bgcolor: active ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                                    color: active ? 'primary.light' : 'text.secondary',
                                    '&:hover': {
                                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                                        color: 'white',
                                    },
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="active-pill"
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            width: '4px',
                                            height: '24px',
                                            backgroundColor: theme.palette.primary.main,
                                            borderRadius: '0 4px 4px 0'
                                        }}
                                    />
                                )}
                                <ListItemIcon sx={{
                                    minWidth: 45,
                                    color: active ? 'primary.light' : 'inherit',
                                    '& svg': { fontSize: 24 }
                                }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontWeight: active ? 800 : 600,
                                        fontSize: '0.95rem'
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    )
                })}
            </List>

            {/* Admin/Supervisor Section */}
            {(user?.role === 'admin' || user?.role === 'supervisor') && (
                <Box sx={{ px: 2, pb: 4 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            px: 2,
                            mb: 2,
                            display: 'block',
                            color: 'rgba(255,255,255,0.3)',
                            fontWeight: 800,
                            letterSpacing: '1.5px'
                        }}
                    >
                        MANAGEMENT
                    </Typography>

                    <ListItem disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            onClick={() => navigate('/blocks')}
                            sx={{
                                borderRadius: 3,
                                py: 1.5,
                                bgcolor: location.pathname === '/blocks' ? alpha(theme.palette.primary.light, 0.1) : 'transparent',
                                color: location.pathname === '/blocks' ? 'primary.light' : 'text.secondary',
                                '&:hover': { bgcolor: alpha(theme.palette.primary.light, 0.05), color: 'white' },
                            }}
                        >
                            <ListItemIcon sx={{ minWidth: 45, color: 'inherit' }}>
                                <LayersOutlined />
                            </ListItemIcon>
                            <ListItemText
                                primary="Block Boundaries"
                                primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
                            />
                        </ListItemButton>
                    </ListItem>

                    {user?.role === 'admin' && (
                        <ListItem disablePadding sx={{ mb: 1 }}>
                            <ListItemButton
                                onClick={() => navigate('/pending-approvals')}
                                sx={{
                                    borderRadius: 3,
                                    py: 1.5,
                                    bgcolor: location.pathname === '/pending-approvals' ? alpha(theme.palette.primary.light, 0.1) : 'transparent',
                                    color: location.pathname === '/pending-approvals' ? 'primary.light' : 'text.secondary',
                                    '&:hover': { bgcolor: alpha(theme.palette.primary.light, 0.05), color: 'white' },
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 45, color: 'inherit' }}>
                                    <VerifiedUserOutlined />
                                </ListItemIcon>
                                <ListItemText
                                    primary="Security Center"
                                    primaryTypographyProps={{ fontWeight: 700, fontSize: '0.95rem' }}
                                />
                            </ListItemButton>
                        </ListItem>
                    )}
                </Box>
            )}
        </Box>
    )
}
