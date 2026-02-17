import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import {
    Box,
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Drawer,
    Alert,
    Avatar,
    Tooltip,
    Menu,
    MenuItem,
} from '@mui/material'
import {
    Menu as MenuIcon,
    Logout,
    WifiOff,
    NotificationsNone,
} from '@mui/icons-material'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from './Navigation'
import { isOnline } from '@/services/offline.service'
import { motion, AnimatePresence } from 'framer-motion'

const DRAWER_WIDTH = 280

export function AppLayout() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [offline, setOffline] = useState(!isOnline())
    const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null)
    const { user, signOut } = useAuth()

    useEffect(() => {
        const handleOnline = () => setOffline(false)
        const handleOffline = () => setOffline(true)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen)
    }

    const handleLogout = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Logout error:', error)
        }
    }

    return (
        <Box sx={{
            display: 'flex',
            minHeight: '100vh',
            bgcolor: '#0f172a',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Ambient Background Glows */}
            <Box sx={{
                position: 'fixed',
                top: -100,
                right: -100,
                width: 400,
                height: 400,
                borderRadius: '50%',
                bgcolor: 'rgba(46, 125, 50, 0.05)',
                filter: 'blur(100px)',
                zIndex: 0,
            }} />
            <Box sx={{
                position: 'fixed',
                bottom: -100,
                left: DRAWER_WIDTH,
                width: 500,
                height: 500,
                borderRadius: '50%',
                bgcolor: 'rgba(46, 125, 50, 0.03)',
                filter: 'blur(100px)',
                zIndex: 0,
            }} />

            <AppBar
                position="fixed"
                sx={{
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    ml: { md: `${DRAWER_WIDTH}px` },
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                }}
            >
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2, display: { md: 'none' } }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" fontWeight={800} sx={{ letterSpacing: '0.5px' }}>
                            {offline ? 'OFFLINE MODE' : 'OPERATIONS'}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 3 } }}>
                        {offline && (
                            <Tooltip title="You are offline">
                                <WifiOff color="warning" />
                            </Tooltip>
                        )}

                        <IconButton
                            color="inherit"
                            onClick={(e) => setNotificationAnchor(e.currentTarget)}
                        >
                            <NotificationsNone />
                        </IconButton>
                        <Menu
                            anchorEl={notificationAnchor}
                            open={Boolean(notificationAnchor)}
                            onClose={() => setNotificationAnchor(null)}
                            PaperProps={{
                                sx: { width: 320, maxHeight: 400, mt: 1.5 }
                            }}
                            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                        >
                            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
                            </Box>
                            <MenuItem onClick={() => setNotificationAnchor(null)}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={600}>System Update</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Platform version 2.1 is now live with enhanced offline capabilities.
                                    </Typography>
                                </Box>
                            </MenuItem>
                            <MenuItem onClick={() => setNotificationAnchor(null)}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={600}>Sync Complete</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        All field records have been successfully synchronized.
                                    </Typography>
                                </Box>
                            </MenuItem>
                        </Menu>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pl: 2, borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                            <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                                <Typography variant="subtitle2" fontWeight={700} lineHeight={1}>
                                    {user?.email?.split('@')[0].toUpperCase()}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 600 }}>
                                    {user?.role?.toUpperCase()}
                                </Typography>
                            </Box>
                            <Avatar
                                sx={{
                                    width: 40,
                                    height: 40,
                                    bgcolor: 'primary.main',
                                    fontWeight: 800,
                                    fontSize: '1rem',
                                    boxShadow: '0 0 0 2px rgba(46, 125, 50, 0.2)'
                                }}
                            >
                                {user?.email?.[0].toUpperCase()}
                            </Avatar>
                            <IconButton color="inherit" onClick={handleLogout} title="Logout">
                                <Logout />
                            </IconButton>
                        </Box>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box
                component="nav"
                sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
            >
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{ keepMounted: true }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
                    }}
                >
                    <Navigation />
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{
                        display: { xs: 'none', md: 'block' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
                    }}
                    open
                >
                    <Navigation />
                </Drawer>
            </Box>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 2, md: 4 },
                    width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
                    mt: '64px',
                    zIndex: 1,
                    position: 'relative',
                }}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.4 }}
                    >
                        {offline && (
                            <Alert
                                severity="warning"
                                variant="outlined"
                                sx={{
                                    mb: 3,
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255, 152, 0, 0.05)',
                                    borderColor: 'rgba(255, 152, 0, 0.2)',
                                    color: '#ffb74d'
                                }}
                            >
                                Connectivity lost. Your changes will be synced automatically when back online.
                            </Alert>
                        )}
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </Box>
        </Box>
    )
}
