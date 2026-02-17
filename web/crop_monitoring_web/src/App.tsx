import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppLayout } from '@/components/Layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { theme } from '@/theme/theme'

// Lazy load dashboard and map pages for better performance
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const MapViewPage = lazy(() => import('@/pages/MapViewPage').then(m => ({ default: m.MapViewPage })))
const DataManagementPage = lazy(() => import('@/pages/DataManagementPage').then(m => ({ default: m.DataManagementPage })))
const DataDemoPage = lazy(() => import('@/pages/DataDemoPage').then(m => ({ default: m.DataDemoPage })))
const SignUpPage = lazy(() => import('@/pages/SignUpPage').then(m => ({ default: m.SignUpPage })))
const PendingApprovalsPage = lazy(() => import('@/pages/PendingApprovalsPage').then(m => ({ default: m.PendingApprovalsPage })))
const BlockManagementPage = lazy(() => import('@/pages/BlockManagementPage').then(m => ({ default: m.BlockManagementPage })))

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

// Loading fallback
function LoadingFallback() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="60vh"
    >
      <CircularProgress />
    </Box>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<HomePage />} />
                <Route
                  path="data"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <DataManagementPage />
                    </Suspense>
                  }
                />
                <Route
                  path="dashboard"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <DashboardPage />
                    </Suspense>
                  }
                />
                <Route
                  path="map"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <MapViewPage />
                    </Suspense>
                  }
                />
                <Route
                  path="demo"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <DataDemoPage />
                    </Suspense>
                  }
                />
                <Route
                  path="pending-approvals"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <PendingApprovalsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="blocks"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <BlockManagementPage />
                    </Suspense>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
