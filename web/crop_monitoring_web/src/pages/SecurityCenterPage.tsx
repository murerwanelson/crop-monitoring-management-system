import { useState, useEffect } from 'react'
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
    Button,
    Chip,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tabs,
    Tab,
    Card,
    CardContent,
    useTheme,
    alpha,
    Snackbar
} from '@mui/material'
import {
    CheckCircle,
    Refresh,
    Security,
    Group,
    AdminPanelSettings,
    VerifiedUser,
    Lock
} from '@mui/icons-material'
import { fetchPendingUsers, updateUserStatus, fetchStaff } from '@/services/staff.service'
import type { Profile } from '@/types/database.types'

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function CustomTabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

export function SecurityCenterPage() {
    const theme = useTheme()
    const [tabValue, setTabValue] = useState(0)

    // State
    const [stats, setStats] = useState({ totalPending: 0, totalStaff: 0, totalAdmins: 0 })
    const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
    const [allStaff, setAllStaff] = useState<Profile[]>([])

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        type: 'approve' | 'reject';
        user: Profile | null;
    }>({ open: false, type: 'approve', user: null })

    const loadData = async () => {
        setLoading(true)
        setError('')
        try {
            const [pending, staff] = await Promise.all([
                fetchPendingUsers(),
                fetchStaff()
            ])
            const pendingSafe = pending || []
            const staffSafe = staff || []
            setPendingUsers(pendingSafe)
            setAllStaff(staffSafe)

            // Calculate stats
            setStats({
                totalPending: pendingSafe.length,
                totalStaff: staffSafe.filter(u => u.status !== 'rejected').length,
                totalAdmins: staffSafe.filter(u => u.role === 'admin' && u.status !== 'rejected').length
            })
        } catch (err: any) {
            setError(err.message || 'Failed to load security data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleAction = async () => {
        const { user, type } = confirmDialog
        if (!user) return

        setActionLoading(user.id)
        setConfirmDialog({ ...confirmDialog, open: false })

        try {
            await updateUserStatus(
                user.id,
                user.email,
                user.role,
                type === 'approve' ? 'approved' : 'rejected'
            )
            // Refresh data to update lists and stats
            await loadData()
            setSuccessMessage(`User successfully ${type === 'approve' ? 'approved' : 'rejected'}`)
        } catch (err: any) {
            setError(`Failed to ${type} user: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    const openConfirm = (user: Profile, type: 'approve' | 'reject') => {
        setConfirmDialog({ open: true, type, user })
    }

    const StatCard = ({ title, count, icon, color }: any) => (
        <Card sx={{
            height: '100%',
            bgcolor: alpha(color, 0.1),
            border: `1px solid ${alpha(color, 0.2)}`,
            borderRadius: 4,
            boxShadow: 'none'
        }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3 }}>
                <Box>
                    <Typography variant="overline" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 1.2 }}>
                        {title}
                    </Typography>
                    <Typography variant="h3" fontWeight={900} sx={{ color: color, mt: 1 }}>
                        {count}
                    </Typography>
                </Box>
                <Box sx={{
                    p: 2,
                    borderRadius: '50%',
                    bgcolor: alpha(color, 0.2),
                    color: color,
                    display: 'flex'
                }}>
                    {icon}
                </Box>
            </CardContent>
        </Card>
    )

    return (
        <Container maxWidth="xl" sx={{ py: 4, pb: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                        <Security sx={{ fontSize: 32, color: 'primary.main' }} />
                        <Typography variant="h4" fontWeight={900} sx={{ color: 'white' }}>
                            Security <span style={{ color: theme.palette.primary.light }}>Center</span>
                        </Typography>
                    </Box>
                    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                        Centralized access control, user management, and security monitoring.
                    </Typography>
                </Box>
                <Button
                    startIcon={<Refresh />}
                    onClick={loadData}
                    disabled={loading}
                    variant="outlined"
                    sx={{ borderRadius: 3, textTransform: 'none' }}
                >
                    Refresh Data
                </Button>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="security tabs">
                    <Tab label="Overview" icon={<AdminPanelSettings />} iconPosition="start" />
                    <Tab
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                Access Requests
                                {stats.totalPending > 0 && (
                                    <Chip
                                        label={stats.totalPending}
                                        size="small"
                                        color="error"
                                        sx={{ height: 20, minWidth: 20, borderRadius: 1 }}
                                    />
                                )}
                            </Box>
                        }
                        icon={<Lock />}
                        iconPosition="start"
                    />
                    <Tab label="User Directory" icon={<Group />} iconPosition="start" />
                </Tabs>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

            {/* TAB 1: OVERVIEW */}
            <CustomTabPanel value={tabValue} index={0}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <StatCard
                            title="PENDING REQUESTS"
                            count={stats.totalPending}
                            icon={<Lock fontSize="large" />}
                            color={theme.palette.error.main}
                        />
                    </Box>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <StatCard
                            title="ACTIVE STAFF"
                            count={stats.totalStaff}
                            icon={<Group fontSize="large" />}
                            color={theme.palette.success.main}
                        />
                    </Box>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <StatCard
                            title="ADMINISTRATORS"
                            count={stats.totalAdmins}
                            icon={<VerifiedUser fontSize="large" />}
                            color={theme.palette.info.main}
                        />
                    </Box>
                </Box>
            </CustomTabPanel>

            {/* TAB 2: ACCESS REQUESTS */}
            <CustomTabPanel value={tabValue} index={1}>
                <TableContainer component={Paper} elevation={0} sx={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4,
                    bgcolor: alpha(theme.palette.background.paper, 0.05),
                    backdropFilter: 'blur(10px)'
                }}>
                    {loading ? (
                        <Box sx={{ p: 8, textAlign: 'center' }}>
                            <CircularProgress />
                            <Typography sx={{ mt: 2 }}>Loading requests...</Typography>
                        </Box>
                    ) : pendingUsers.length === 0 ? (
                        <Box sx={{ p: 8, textAlign: 'center', opacity: 0.7 }}>
                            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2, opacity: 0.5 }} />
                            <Typography variant="h6" fontWeight={700}>All Clear</Typography>
                            <Typography variant="body2">No pending access requests.</Typography>
                        </Box>
                    ) : (
                        <Table>
                            <TableHead sx={{ bgcolor: alpha(theme.palette.common.black, 0.2) }}>
                                <TableRow>
                                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>IDENTITY</TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>REQUESTED ROLE</TableCell>
                                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>DATE</TableCell>
                                    <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700 }}>ACTIONS</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingUsers.map((user) => (
                                    <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={700}>
                                                    {user.first_name} {user.last_name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.role.toUpperCase()}
                                                size="small"
                                                color={user.role === 'admin' ? 'secondary' : 'primary'}
                                                variant="outlined"
                                                sx={{ borderRadius: 2, fontWeight: 700 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    onClick={() => openConfirm(user, 'approve')}
                                                    disabled={!!actionLoading}
                                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    onClick={() => openConfirm(user, 'reject')}
                                                    disabled={!!actionLoading}
                                                    sx={{ borderRadius: 2, textTransform: 'none' }}
                                                >
                                                    Reject
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </TableContainer>
            </CustomTabPanel>

            {/* TAB 3: USER DIRECTORY */}
            <CustomTabPanel value={tabValue} index={2}>
                <TableContainer component={Paper} elevation={0} sx={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4,
                    bgcolor: alpha(theme.palette.background.paper, 0.05),
                    backdropFilter: 'blur(10px)'
                }}>
                    <Table>
                        <TableHead sx={{ bgcolor: alpha(theme.palette.common.black, 0.2) }}>
                            <TableRow>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>STAFF MEMBER</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>ROLE</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>STATUS</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>JOINED</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {allStaff.filter(user => user.status !== 'rejected').map((user) => (
                                <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                bgcolor: 'primary.dark',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: 700,
                                                fontSize: 12
                                            }}>
                                                {(user.first_name?.[0] || user.email?.[0] || 'U').toUpperCase()}{(user.last_name?.[0] || '').toUpperCase()}
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={700}>
                                                    {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {user.email}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.role}
                                            size="small"
                                            sx={{
                                                borderRadius: 2,
                                                fontWeight: 600,
                                                bgcolor: user.role === 'admin' ? alpha(theme.palette.secondary.main, 0.1) : alpha(theme.palette.primary.main, 0.1),
                                                color: user.role === 'admin' ? 'secondary.light' : 'primary.light',
                                                border: '1px solid',
                                                borderColor: user.role === 'admin' ? alpha(theme.palette.secondary.main, 0.2) : alpha(theme.palette.primary.main, 0.2)
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.status.toUpperCase()}
                                            size="small"
                                            color={user.status === 'approved' ? 'success' : user.status === 'pending' ? 'warning' : 'error'}
                                            variant="filled"
                                            sx={{ borderRadius: 1, height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CustomTabPanel>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        bgcolor: '#1e293b',
                        backgroundImage: 'none',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                <DialogTitle>
                    {confirmDialog.type === 'approve' ? 'Approve Account Request?' : 'Reject Account Request?'}
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to {confirmDialog.type} the request for{' '}
                        <strong>{confirmDialog.user?.first_name} {confirmDialog.user?.last_name}</strong>?
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                        An email notification will be sent to <strong>{confirmDialog.user?.email}</strong>.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))} color="inherit">Cancel</Button>
                    <Button
                        variant="contained"
                        color={confirmDialog.type === 'approve' ? 'success' : 'error'}
                        onClick={handleAction}
                        sx={{ borderRadius: 2 }}
                    >
                        Confirm {confirmDialog.type === 'approve' ? 'Approval' : 'Rejection'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={!!successMessage}
                autoHideDuration={6000}
                onClose={() => setSuccessMessage('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert onClose={() => setSuccessMessage('')} severity="success" sx={{ width: '100%', borderRadius: 3 }}>
                    {successMessage}
                </Alert>
            </Snackbar>
        </Container>
    )
}
