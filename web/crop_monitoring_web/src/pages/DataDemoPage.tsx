import {
    Container,
    Typography,
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Chip,
    Button,
    Divider,
} from '@mui/material'
import { useStaff } from '@/hooks/useStaff'
import { useObservations } from '@/hooks/useObservations'
import { useAuth } from '@/contexts/AuthContext'
import { Agriculture, Person, Warning, CheckCircle } from '@mui/icons-material'

export function DataDemoPage() {
    const { user: currentUser } = useAuth()
    const isAdmin = currentUser?.role === 'admin'

    const {
        data: staff,
        isLoading: staffLoading,
        isError: staffError,
        error: staffErrorInfo,
    } = useStaff()

    const {
        data: observations,
        isLoading: obsLoading,
        isError: obsError,
        error: obsErrorInfo,
    } = useObservations()

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight={600}>
                    Supabase Data Fetching Demo
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Demonstrating real-time data fetching from Supabase using TanStack Query and TypeScript.
                </Typography>
            </Box>

            {/* User Permissions Info */}
            <Alert severity="info" sx={{ mb: 4 }}>
                Current Role: <strong>{currentUser?.role?.toUpperCase()}</strong>.
                {isAdmin ? ' You have full administrative access.' : ' Role-based filtering is active.'}
            </Alert>

            {/* Staff Section */}
            <Box sx={{ mb: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                    <Person color="primary" />
                    <Typography variant="h5" fontWeight={500}>Staff / Profiles</Typography>
                </Box>
                <TableContainer component={Paper}>
                    {staffLoading ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
                    ) : staffError ? (
                        <Alert severity="error">{staffErrorInfo?.message || 'Error loading staff'}</Alert>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {staff?.map((person) => (
                                    <TableRow key={person.id}>
                                        <TableCell>{person.first_name} {person.last_name}</TableCell>
                                        <TableCell>{person.email}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={person.role}
                                                size="small"
                                                color={person.role === 'admin' ? 'secondary' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                disabled={!isAdmin}
                                            >
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
            </Box>

            <Divider sx={{ mb: 6 }} />

            {/* Observations Section */}
            <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
                    <Agriculture color="primary" />
                    <Typography variant="h5" fontWeight={500}>Recent Observations (Rich Data)</Typography>
                </Box>
                <TableContainer component={Paper}>
                    {obsLoading ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
                    ) : obsError ? (
                        <Alert severity="error">{obsErrorInfo?.message || 'Error loading observations'}</Alert>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Field</TableCell>
                                    <TableCell>Crop</TableCell>
                                    <TableCell>Stress Level</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Images</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {observations?.map((obs) => (
                                    <TableRow key={obs.id}>
                                        <TableCell>{obs.field_name}</TableCell>
                                        <TableCell>
                                            {obs.crop_information?.crop_type || 'N/A'}
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                {obs.crop_information?.variety}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                {obs.crop_monitoring?.stress === 'None' ? (
                                                    <CheckCircle fontSize="small" color="success" />
                                                ) : (
                                                    <Warning fontSize="small" color="warning" />
                                                )}
                                                {obs.crop_monitoring?.stress || 'Unknown'}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{new Date(obs.date_recorded).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${obs.images?.length || 0} Images`}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
            </Box>
        </Container>
    )
}
