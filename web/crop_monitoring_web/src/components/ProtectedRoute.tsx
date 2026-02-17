import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { CircularProgress, Box } from '@mui/material'
import type { UserRole } from '@/types/auth.types'

interface ProtectedRouteProps {
    children: React.ReactNode
    allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading, isAuthenticated } = useAuth()
    const location = useLocation()

    if (isLoading) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                minHeight="100vh"
            >
                <CircularProgress />
            </Box>
        )
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />
    }

    return <>{children}</>
}
