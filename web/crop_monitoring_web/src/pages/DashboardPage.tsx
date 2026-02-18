import { useState, useMemo } from 'react'
import {
    Container,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    useTheme,
    alpha,
    Grid,
} from '@mui/material'
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    LineChart,
    Line,
} from 'recharts'
import { useObservations } from '@/hooks/useObservations'
import { format, isWithinInterval, parseISO } from 'date-fns'
import {
    TrendingUp,
    Opacity,
    Agriculture,
    Warning,
    CheckCircle
} from '@mui/icons-material'
import { FilterBar } from '@/components/Dashboard/FilterBar'
import { FertilizerPerformanceChart } from '@/components/Dashboard/FertilizerPerformanceChart'

export function DashboardPage() {
    const theme = useTheme()
    const [filters, setFilters] = useState({
        startDate: null as string | null,
        endDate: null as string | null,
        cropType: 'all',
        variety: 'all',
        section: 'all',
        block: 'all',
        field: 'all',
    })

    const { data: observations, isLoading, error } = useObservations()

    const handleFilterChange = (name: string, value: any) => {
        setFilters(prev => ({ ...prev, [name]: value }))
    }

    // Get unique values for filters
    const filterOptions = useMemo(() => {
        if (!observations) return { cropTypes: [], varieties: [], sections: [], blocks: [], fields: [] }

        return {
            cropTypes: Array.from(new Set(observations.map(obs => obs.crop_information?.crop_type).filter(Boolean))) as string[],
            varieties: Array.from(new Set(observations.map(obs => obs.crop_information?.variety).filter(Boolean))) as string[],
            sections: Array.from(new Set(observations.map(obs => obs.section_name).filter(Boolean))) as string[],
            blocks: Array.from(new Set(observations.map(obs => obs.block_id).filter(Boolean))) as string[],
            fields: Array.from(new Set(observations.map(obs => obs.field_name).filter(Boolean))) as string[],
        }
    }, [observations])

    // Filter observations
    const filteredObservations = useMemo(() => {
        if (!observations) return []

        return observations.filter(obs => {
            if (filters.cropType !== 'all' && obs.crop_information?.crop_type !== filters.cropType) return false
            if (filters.variety !== 'all' && obs.crop_information?.variety !== filters.variety) return false
            if (filters.section !== 'all' && obs.section_name !== filters.section) return false
            if (filters.block !== 'all' && obs.block_id !== filters.block) return false
            if (filters.field !== 'all' && obs.field_name !== filters.field) return false

            if (filters.startDate || filters.endDate) {
                const obsDate = parseISO(obs.date_recorded)
                const start = filters.startDate ? parseISO(filters.startDate) : new Date(0)
                const end = filters.endDate ? parseISO(filters.endDate) : new Date()
                if (!isWithinInterval(obsDate, { start, end })) return false
            }

            return true
        })
    }, [observations, filters])

    // Prepare data for crop growth chart
    const cropGrowthData = useMemo(() => {
        return filteredObservations
            .filter(obs => obs.crop_monitoring?.canopy_cover)
            .map(obs => ({
                date: format(new Date(obs.date_recorded), 'MMM dd'),
                canopy_cover: obs.crop_monitoring?.canopy_cover,
                vigor: obs.crop_monitoring?.crop_vigor === 'Excellent' ? 100 : obs.crop_monitoring?.crop_vigor === 'Good' ? 75 : obs.crop_monitoring?.crop_vigor === 'Fair' ? 50 : 25,
                vigorName: obs.crop_monitoring?.crop_vigor,
                stage: obs.crop_information?.crop_stage,
                fieldName: obs.field_name,
                fullDate: obs.date_recorded,
            }))
            .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
    }, [filteredObservations])

    // Prepare data for moisture trends chart
    const moistureTrendsData = useMemo(() => {
        return filteredObservations
            .filter(obs => obs.irrigation_management?.soil_moisture_percentage)
            .map(obs => ({
                date: format(new Date(obs.irrigation_management?.irrigation_date || obs.date_recorded), 'MMM dd'),
                soil_moisture: obs.irrigation_management?.soil_moisture_percentage,
                volume: obs.irrigation_management?.irrigation_volume || 0,
                fieldName: obs.field_name,
                fullDate: obs.irrigation_management?.irrigation_date || obs.date_recorded,
            }))
            .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
    }, [filteredObservations])

    const stats = useMemo(() => {
        if (!filteredObservations.length) {
            return {
                avgMoisture: '0.0',
                avgCanopy: '0.0',
                total: 0,
                healthStatus: 'NO DATA',
                healthColor: 'text.disabled'
            }
        }
        const avgMoisture = filteredObservations.reduce((acc, curr) => acc + (curr.irrigation_management?.soil_moisture_percentage || 0), 0) / filteredObservations.length
        const avgCanopy = filteredObservations.reduce((acc, curr) => acc + (curr.crop_monitoring?.canopy_cover || 0), 0) / filteredObservations.length

        // Dynamic Health Index Logic
        const stressCount = filteredObservations.filter(obs => obs.crop_monitoring?.stress && obs.crop_monitoring.stress !== 'None').length
        const stressRatio = stressCount / (filteredObservations.length || 1)
        const healthStatus = stressRatio > 0.3 ? 'CRITICAL' : stressRatio > 0.1 ? 'WARNING' : 'OPTIMAL'
        const healthColor = healthStatus === 'CRITICAL' ? 'error.main' : healthStatus === 'WARNING' ? 'warning.main' : 'success.main'

        return {
            avgMoisture: avgMoisture.toFixed(1),
            avgCanopy: avgCanopy.toFixed(1),
            total: filteredObservations.length,
            healthStatus,
            healthColor
        }
    }, [filteredObservations])

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress color="primary" />
            </Box>
        )
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error" variant="filled" sx={{ borderRadius: 3 }}>
                    Error loading dashboard data: {error.message}
                </Alert>
            </Container>
        )
    }

    return (
        <Container maxWidth="xl" sx={{ pb: 6 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" fontWeight={900} sx={{ color: 'white', mb: 1 }}>
                    Intelligence <span style={{ color: theme.palette.primary.light }}>Center</span>
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
                    Section 5.4 - Comprehensive agricultural performance and correlation analysis.
                </Typography>

                <FilterBar
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    options={filterOptions}
                />
            </Box>

            {/* Metric Overview */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{ p: 1.5, bgcolor: 'primary.main', borderRadius: 2.5, mr: 2, display: 'flex' }}>
                                <Agriculture sx={{ color: 'white' }} />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1 }}>ANALYSIS POINT</Typography>
                                <Typography variant="h4" fontWeight={900}>{stats?.total}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{ p: 1.5, bgcolor: '#4caf50', borderRadius: 2.5, mr: 2, display: 'flex' }}>
                                <TrendingUp sx={{ color: 'white' }} />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1 }}>AVG CANOPY</Typography>
                                <Typography variant="h4" fontWeight={900}>{stats?.avgCanopy}%</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{ p: 1.5, bgcolor: '#2196f3', borderRadius: 2.5, mr: 2, display: 'flex' }}>
                                <Opacity sx={{ color: 'white' }} />
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1 }}>SOIL MOISTURE</Typography>
                                <Typography variant="h4" fontWeight={900}>{stats?.avgMoisture}%</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <Card sx={{ border: `2px solid ${stats?.healthColor}` }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                            <Box sx={{ p: 1.5, bgcolor: stats?.healthColor, borderRadius: 2.5, mr: 2, display: 'flex' }}>
                                {stats?.healthStatus === 'OPTIMAL' ? <CheckCircle sx={{ color: 'white' }} /> : <Warning sx={{ color: 'white' }} />}
                            </Box>
                            <Box>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1 }}>HEALTH INDEX</Typography>
                                <Typography variant="h4" fontWeight={900} sx={{ color: stats?.healthColor }}>{stats?.healthStatus}</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Charts Grid */}
            <Grid container spacing={4}>
                <Grid size={{ xs: 12, lg: 8 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ mb: 4 }}>
                                Canopy Development & Vigor
                            </Typography>
                            {cropGrowthData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <AreaChart data={cropGrowthData}>
                                        <defs>
                                            <linearGradient id="colorCanopy" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                        <Box sx={{ p: 2, bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 }}>
                                                            <Typography variant="subtitle2" fontWeight={800} color="primary.light">{d.fieldName}</Typography>
                                                            <Typography variant="caption" display="block" color="text.secondary">{d.fullDate}</Typography>
                                                            <Box sx={{ mt: 1, borderTop: '1px solid rgba(255,255,255,0.05)', pt: 1 }}>
                                                                <Typography variant="body2">Canopy: {d.canopy_cover}%</Typography>
                                                                <Typography variant="body2">Vigor: {d.vigorName}</Typography>
                                                                <Typography variant="body2">Stage: {d.stage}</Typography>
                                                            </Box>
                                                        </Box>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="canopy_cover"
                                            stroke={theme.palette.primary.main}
                                            strokeWidth={4}
                                            fillOpacity={1}
                                            fill="url(#colorCanopy)"
                                            name="Canopy Cover %"
                                        />
                                        <Line type="monotone" dataKey="vigor" stroke={theme.palette.warning.main} strokeWidth={2} dot={false} name="Vigor Index" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
                                    <Typography color="text.secondary" textAlign="center">No growth data found for selection</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, lg: 4 }}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h6" fontWeight={800} gutterBottom sx={{ mb: 4 }}>
                                Moisture Saturation & Irrigation
                            </Typography>
                            {moistureTrendsData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={moistureTrendsData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis
                                            dataKey="date"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                                        />
                                        <Line
                                            type="stepAfter"
                                            dataKey="soil_moisture"
                                            stroke="#2196f3"
                                            strokeWidth={3}
                                            dot={{ r: 4, fill: '#2196f3', strokeWidth: 2, stroke: '#1e293b' }}
                                            name="Moisture %"
                                        />
                                        <Line type="monotone" dataKey="volume" stroke={theme.palette.info.light} strokeWidth={1} dot={{ r: 2 }} name="Irrigation Volume" />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2 }}>
                                    <Typography color="text.secondary" textAlign="center">No moisture data found</Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12 }}>
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <FertilizerPerformanceChart data={filteredObservations} />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    )
}
