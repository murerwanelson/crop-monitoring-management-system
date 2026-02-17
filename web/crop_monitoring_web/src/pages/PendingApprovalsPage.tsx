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
    IconButton,
    Button,
    Chip,
    Alert,
    CircularProgress,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material'
import {
    CheckCircle,
    Cancel,
    Refresh,
    PersonOutline,
} from '@mui/icons-material'
import { fetchPendingUsers, updateUserStatus } from '@/services/staff.service'
import type { Profile } from '@/types/database.types'

export function PendingApprovalsPage() {
    const [pendingUsers, setPendingUsers] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
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
            const data = await fetchPendingUsers()
            setPendingUsers(data)
        } catch (err: any) {
            setError(err.message || 'Failed to load pending requests')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [])

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
            // Remove from local list
            setPendingUsers(prev => prev.filter(u => u.id !== user.id))
        } catch (err: any) {
            setError(`Failed to ${type} user: ${err.message}`)
        } finally {
            setActionLoading(null)
        }
    }

    const openConfirm = (user: Profile, type: 'approve' | 'reject') => {
        setConfirmDialog({ open: true, type, user })
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight={600} gutterBottom>
                        Pending Account Approvals
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Review and manage requests from new Administrators and Supervisors.
                    </Typography>
                </Box>
                <Button
                    startIcon={<Refresh />}
                    onClick={loadData}
                    disabled={loading}
                    variant="outlined"
                >
                    Refresh
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                {loading ? (
                    <Box sx={{ p: 8, textAlign: 'center' }}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Loading requests...</Typography>
                    </Box>
                ) : pendingUsers.length === 0 ? (
                    <Box sx={{ p: 8, textAlign: 'center' }}>
                        <PersonOutline sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">No pending requests found</Typography>
                        <Typography variant="body2" color="text.disabled">All users are currently processed.</Typography>
                    </Box>
                ) : (
                    <Table>
                        <TableHead sx={{ bgcolor: 'action.hover' }}>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Requested Role</TableCell>
                                <TableCell>Date Requested</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {pendingUsers.map((user) => (
                                <TableRow key={user.id} hover>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                        {user.first_name} {user.last_name}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={user.role}
                                            size="small"
                                            color={user.role === 'admin' ? 'secondary' : 'primary'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                            <Tooltip title="Approve Account">
                                                <IconButton
                                                    color="success"
                                                    onClick={() => openConfirm(user, 'approve')}
                                                    disabled={!!actionLoading}
                                                >
                                                    {actionLoading === user.id ? <CircularProgress size={24} /> : <CheckCircle />}
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Reject Account">
                                                <IconButton
                                                    color="error"
                                                    onClick={() => openConfirm(user, 'reject')}
                                                    disabled={!!actionLoading}
                                                >
                                                    <Cancel />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>
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
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setConfirmDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={confirmDialog.type === 'approve' ? 'success' : 'error'}
                        onClick={handleAction}
                    >
                        Confirm {confirmDialog.type === 'approve' ? 'Approval' : 'Rejection'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    )
}
