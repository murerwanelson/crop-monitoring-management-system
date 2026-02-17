import React, { useState, useMemo, Component, ReactNode } from 'react'
import {
    Container,
    Box,
    Typography,
    Paper,
    Button,
    useTheme,
    CircularProgress,
    Alert,
    TablePagination,
    TextField,
    InputAdornment,
} from '@mui/material'
import {
    DownloadOutlined,
    Search,
} from '@mui/icons-material'
import { useObservations } from '@/hooks/useObservations'
import { useAuth } from '@/contexts/AuthContext'
import type { FullObservation } from '@/types/database.types'
import { ObservationTable } from '@/components/Data/ObservationTable'
import { ObservationDetailDialog } from '@/components/Data/ObservationDetailDialog'
import { ObservationEditDialog } from '@/components/Data/ObservationEditDialog'
import { exportToCSV, generatePDFReport } from '@/utils/exportUtils'
import { updateObservation } from '@/services/database.service'
import { FilterBar } from '@/components/Dashboard/FilterBar'

// Simple Error Boundary for debugging
interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <Box p={4}>
                    <Alert severity="error">
                        <Typography variant="h6">Something went wrong</Typography>
                        <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
                    </Alert>
                </Box>
            );
        }

        return this.props.children;
    }
}

export function DataManagementPage() {
    return (
        <ErrorBoundary>
            <DataManagementPageContent />
        </ErrorBoundary>
    )
}

function DataManagementPageContent() {
    const theme = useTheme()
    const { user } = useAuth()
    const { data: observations, isLoading, error, mutate } = useObservations()

    // State
    const [page, setPage] = useState(0)
    const [rowsPerPage, setRowsPerPage] = useState(10)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedObservation, setSelectedObservation] = useState<FullObservation | null>(null)
    const [detailOpen, setDetailOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [filters, setFilters] = useState({
        startDate: null as string | null,
        endDate: null as string | null,
        cropType: 'all',
        variety: 'all',
        section: 'all',
        block: 'all',
        field: 'all',
    })

    const isAdmin = user?.role === 'admin'

    // Filtering Logic
    const handleFilterChange = (name: string, value: any) => {
        setFilters(prev => ({ ...prev, [name]: value }))
        setPage(0)
    }

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

    const filteredObservations = useMemo(() => {
        if (!observations) return []
        return observations.filter(obs => {
            // Text Search
            const searchLower = searchTerm.toLowerCase()
            const matchesSearch =
                obs.field_name.toLowerCase().includes(searchLower) ||
                (obs.crop_information?.crop_type || '').toLowerCase().includes(searchLower) ||
                obs.section_name.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false

            // Advanced Filters
            if (filters.cropType !== 'all' && obs.crop_information?.crop_type !== filters.cropType) return false
            if (filters.variety !== 'all' && obs.crop_information?.variety !== filters.variety) return false
            if (filters.section !== 'all' && obs.section_name !== filters.section) return false
            if (filters.block !== 'all' && obs.block_id !== filters.block) return false
            if (filters.field !== 'all' && obs.field_name !== filters.field) return false

            if (filters.startDate && new Date(obs.date_recorded) < new Date(filters.startDate)) return false
            if (filters.endDate && new Date(obs.date_recorded) > new Date(filters.endDate)) return false

            return true
        })
    }, [observations, searchTerm, filters])

    // Handlers
    const handleView = (obs: FullObservation) => {
        setSelectedObservation(obs)
        setDetailOpen(true)
    }

    const handleEdit = (obs: FullObservation) => {
        setSelectedObservation(obs)
        setEditOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
            // In a real app, call delete service here
            console.log('Delete feature to be implemented securely', id)
        }
    }

    const handleSaveEdit = async (updatedObs: FullObservation) => {
        await updateObservation(updatedObs)
        mutate() // Refresh data
    }

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage)
    }

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10))
        setPage(0)
    }

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
                <Alert severity="error" variant="filled">Error: {error.message}</Alert>
            </Container>
        )
    }

    const paginatedObservations = filteredObservations.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    )

    return (
        <Container maxWidth="xl" sx={{ pb: 6 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h3" fontWeight={900} sx={{ color: 'white' }}>
                        Field <span style={{ color: theme.palette.primary.light }}>Intelligence Assets</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 600 }}>
                        Audit and manage comprehensive multi-spectral crop observation records.
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadOutlined />}
                        onClick={() => exportToCSV(filteredObservations)}
                        disabled={filteredObservations.length === 0}
                    >
                        Export CSV
                    </Button>
                    {/* Placeholder for future bulk actions */}
                </Box>
            </Box>

            {/* Advanced Filters */}
            <Box sx={{ mb: 4 }}>
                <FilterBar
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    options={filterOptions}
                />
            </Box>

            {/* Search Bar */}
            <Paper sx={{ p: 1, mb: 3, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <TextField
                    fullWidth
                    variant="filled"
                    placeholder="Search by field, section, crop type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        disableUnderline: true,
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search sx={{ color: 'primary.light' }} />
                            </InputAdornment>
                        ),
                        sx: { borderRadius: 2, bgcolor: 'transparent' }
                    }}
                />
            </Paper>

            {/* Data Table */}
            <ObservationTable
                observations={paginatedObservations}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isAdmin={isAdmin}
            />

            <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={filteredObservations.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ color: 'text.secondary' }}
            />

            {/* Dialogs */}
            <ObservationDetailDialog
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                observation={selectedObservation}
                onGenerateReport={generatePDFReport}
            />

            <ObservationEditDialog
                open={editOpen}
                onClose={() => setEditOpen(false)}
                observation={selectedObservation}
                onSave={handleSaveEdit}
            />
        </Container>
    )
}
