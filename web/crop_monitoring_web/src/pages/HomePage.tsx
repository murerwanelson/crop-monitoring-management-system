import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box,
    Container,
    Card,
    CardContent,
    Typography,
    Button,
    Paper,
    alpha,
    useTheme,
    Grid,
} from '@mui/material'
import {
    AgricultureOutlined,
    TableChartOutlined,
    DashboardOutlined,
    MapOutlined,
    CheckCircleOutline,
    ArrowForward,
} from '@mui/icons-material'
import { useObservations } from '@/hooks/useObservations'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'

const MotionCard = motion(Card)

export function HomePage() {
    const navigate = useNavigate()
    const theme = useTheme()
    const { user } = useAuth()
    const { data: observations } = useObservations()

    const totalObservations = observations?.length || 0
    const uniqueFields = new Set(observations?.map(obs => `${obs.section_name}-${obs.block_id}-${obs.field_name}`)).size
    const uniqueCropTypes = new Set(observations?.map(obs => obs.crop_information?.crop_type).filter(Boolean)).size

    const steps = [
        'Initialize GPS positioning for precise field location.',
        'Validate field identification (Section/Block/Field).',
        'Verify crop variety and phonological growth stage.',
        'Perform stress analysis and canopy cover documentation.',
        'Execute multi-spectral photo documentation.',
        'Input soil nutrient and irrigation parameters.',
        'Analyze pest and disease pressure vectors.',
        'Finalize synchronized report to the central dashboard.',
    ]

    return (
        <Container maxWidth="xl" sx={{ pb: 8 }}>
            <Box sx={{ mb: 6 }}>
                <Typography variant="h2" fontWeight={900} sx={{ color: 'white', mb: 1 }}>
                    System <span style={{ color: theme.palette.primary.light }}>Command Center</span>
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 800, fontSize: '1.1rem' }}>
                    Welcome back, <strong style={{ color: 'white' }}>{user?.email?.split('@')[0]}</strong>.
                    {user?.role === 'admin' && ' Critical infrastructure and administrative controls are ready for review.'}
                    {user?.role === 'supervisor' && ' Precision field monitoring data and operational insights are synced.'}
                    {user?.role === 'collector' && ' Field data acquisition protocols are active.'}
                </Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 6 }}>
                {[
                    { label: 'Total Records', value: totalObservations, icon: <TableChartOutlined />, color: '#2e7d32' },
                    { label: 'Active Fields', value: uniqueFields, icon: <MapOutlined />, color: '#1b5e20' },
                    { label: 'Crop Variants', value: uniqueCropTypes, icon: <AgricultureOutlined />, color: '#81c784' },
                ].map((stat, i) => (
                    <Grid size={{ xs: 12, md: 4 }} key={i}>
                        <Paper sx={{ p: 4, display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.02)' }}>
                            <Box sx={{ p: 2, bgcolor: alpha(stat.color, 0.1), borderRadius: 3, mr: 3, border: `1px solid ${alpha(stat.color, 0.2)}` }}>
                                {React.isValidElement(stat.icon) ? React.cloneElement(stat.icon as React.ReactElement<any>, { sx: { fontSize: 32, color: stat.color } }) : stat.icon}
                            </Box>
                            <Box>
                                <Typography variant="h3" fontWeight={900}>{stat.value}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1.5 }}>{stat.label.toUpperCase()}</Typography>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Typography variant="h5" fontWeight={800} sx={{ mb: 3, pl: 1 }}>Operational Modules</Typography>
            <Grid container spacing={4} sx={{ mb: 6 }}>
                {[
                    { title: 'Field Records', desc: 'Secure database for all multi-parameter crop observations.', path: '/data', icon: <TableChartOutlined /> },
                    { title: 'Intelligence', desc: 'Advanced data visualizations and predictive performance trends.', path: '/dashboard', icon: <DashboardOutlined /> },
                    { title: 'Geo-Map', desc: 'Interactive GIS mapping for spatial agricultural monitoring.', path: '/map', icon: <MapOutlined /> },
                ].map((item, i) => (
                    <Grid size={{ xs: 12, md: 4 }} key={i}>
                        <MotionCard
                            whileHover={{ y: -8 }}
                            sx={{ height: '100%', cursor: 'pointer', transition: '0.3s' }}
                            onClick={() => navigate(item.path)}
                        >
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ mb: 3, color: 'primary.light' }}>{React.isValidElement(item.icon) ? React.cloneElement(item.icon as React.ReactElement<any>, { sx: { fontSize: 48 } }) : item.icon}</Box>
                                <Typography variant="h5" fontWeight={800} gutterBottom>{item.title}</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4, height: 40, overflow: 'hidden' }}>
                                    {item.desc}
                                </Typography>
                                <Button
                                    variant="text"
                                    endIcon={<ArrowForward />}
                                    sx={{ p: 0, fontWeight: 800, '&:hover': { bgcolor: 'transparent', pl: 1 } }}
                                >
                                    Access Module
                                </Button>
                            </CardContent>
                        </MotionCard>
                    </Grid>
                ))}
            </Grid>

            {/* Protocol Section */}
            <Paper sx={{ p: 6, position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h4" fontWeight={900} gutterBottom>
                        Field Protocol <span style={{ color: theme.palette.primary.light }}>Standards</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 5 }}>
                        Ensure all data collection follows the ISO-certified precision farming workflow.
                    </Typography>
                    <Grid container spacing={2}>
                        {steps.map((step, index) => (
                            <Grid size={{ xs: 12, md: 6 }} key={index}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                                    <CheckCircleOutline sx={{ mr: 2, color: 'primary.main', fontSize: 24, mt: 0.5 }} />
                                    <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        <strong style={{ color: theme.palette.primary.light }}>{index + 1}.</strong> {step}
                                    </Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
                {/* Decorative Icon */}
                <AgricultureOutlined sx={{
                    position: 'absolute',
                    top: -20,
                    right: -20,
                    fontSize: 240,
                    opacity: 0.03,
                    color: 'white',
                    transform: 'rotate(-15deg)'
                }} />
            </Paper>
        </Container>
    )
}
