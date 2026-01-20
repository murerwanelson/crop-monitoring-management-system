import React, { useEffect, useState } from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Select,
    MenuItem,
    FormControl,
    Snackbar,
    Alert,
    CircularProgress,
    Chip,
    Avatar,
    Stack
} from '@mui/material';
import { Person, Security } from '@mui/icons-material';
import api from '../services/api';

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await api.get('/users/');
            setUsers(response.data);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            // Updated to use the correct endpoint for updating a user's role
            // This might require a specific endpoint or just updating the user profile
            // In our UserViewSet, regular update handles it if the UserProfile is nested but 
            // the serializers might need adjustment for writable nested profiles.
            // For now, let's assume a PATCH to users/id/ works with {role: newRole} 
            // if we handled it in the backend (I should check my RegisterSerializer/UserSerializer).

            // Wait, I updated UserSerializer to include 'role' but it's read-only 'source=userprofile.role'.
            // I should have made it writable or added an action.

            await api.patch(`/users/${userId}/`, { role: newRole });

            setSnackbar({ open: true, message: 'User role updated successfully', severity: 'success' });
            loadUsers();
        } catch (err) {
            console.error('Failed to update role:', err);
            setSnackbar({ open: true, message: 'Failed to update user role', severity: 'error' });
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box mb={4}>
                <Typography variant="h4" fontWeight={800} gutterBottom>
                    User Management
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Manage system users, roles, and permissions.
                </Typography>
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'grey.100' }}>
                        <TableRow>
                            <TableCell><Typography fontWeight={700}>User</Typography></TableCell>
                            <TableCell><Typography fontWeight={700}>Email</Typography></TableCell>
                            <TableCell><Typography fontWeight={700}>Current Role</Typography></TableCell>
                            <TableCell><Typography fontWeight={700}>Change Role</Typography></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                            <Person />
                                        </Avatar>
                                        <Box>
                                            <Typography fontWeight={600}>{user.username}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                ID: {user.id}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role}
                                        color={user.role === 'ADMIN' ? 'error' : user.role === 'SUPERVISOR' ? 'info' : 'success'}
                                        size="small"
                                        icon={<Security fontSize="small" />}
                                        sx={{ fontWeight: 700 }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <FormControl size="small" sx={{ minWidth: 150 }}>
                                        <Select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        >
                                            <MenuItem value="FIELD_COLLECTOR">Field Collector</MenuItem>
                                            <MenuItem value="SUPERVISOR">Supervisor</MenuItem>
                                            <MenuItem value="ADMIN">Admin</MenuItem>
                                        </Select>
                                    </FormControl>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
