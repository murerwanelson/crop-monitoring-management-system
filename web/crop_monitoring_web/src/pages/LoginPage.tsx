import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import {
    Box,
    Paper,
    TextField,
    Button,
    Typography,
    Alert,
    Link,
    IconButton,
} from '@mui/material'
import {
    AgricultureOutlined,
    Visibility,
    VisibilityOff,
    EmailOutlined,
    LockOutlined,
    ArrowForward,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { AuthImageSlider } from '@/components/Auth/AuthImageSlider'

const MotionBox = motion(Box)
const MotionPaper = motion(Paper)

export function LoginPage() {
    const { signIn } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await signIn({ email, password })
            navigate('/')
        } catch (err: any) {
            setError(err.message || 'Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.8 } }
    }

    const staggerVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: (i: number) => ({
            opacity: 1,
            x: 0,
            transition: { delay: 0.4 + (i * 0.1), duration: 0.5 }
        })
    }

    return (
        <Box
            sx={{
                minHeight: '100vh',
                width: '100vw',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 2, md: 4 },
                position: 'relative',
                bgcolor: '#0f172a',
                backgroundImage: `radial-gradient(circle at 20% 20%, rgba(46, 125, 50, 0.15) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(46, 125, 50, 0.1) 0%, transparent 40%)`,
                overflow: 'hidden'
            }}
        >
            {/* Ambient Background Elements */}
            <MotionBox
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 5, 0]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                sx={{
                    position: 'absolute',
                    top: '10%',
                    right: '10%',
                    width: 300,
                    height: 300,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.1), transparent)',
                    filter: 'blur(60px)',
                    zIndex: 0
                }}
            />

            <MotionPaper
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                elevation={24}
                sx={{
                    width: '100%',
                    maxWidth: 1000,
                    minHeight: 600,
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    borderRadius: 6,
                    overflow: 'hidden',
                    bgcolor: 'rgba(255,255,255,0.02)',
                    backdropFilter: 'blur(40px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    zIndex: 1
                }}
            >
                {/* Visual Banner Slider */}
                <Box
                    sx={{
                        flex: { xs: '0 0 250px', md: '0 0 45%' },
                        position: 'relative',
                        borderRight: '1px solid rgba(255,255,255,0.05)'
                    }}
                >
                    <AuthImageSlider />

                    {/* Brand Logo Overlay (Floating Top Left) */}
                    <Box sx={{ position: 'absolute', top: 40, left: 40, zIndex: 3, display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ p: 1, bgcolor: 'primary.main', borderRadius: 2, mr: 1.5, display: 'flex' }}>
                            <AgricultureOutlined sx={{ fontSize: 24, color: 'white' }} />
                        </Box>
                        <Typography variant="h6" fontWeight={900} letterSpacing="1px" color="white" sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                            CROP MONITOR
                        </Typography>
                    </Box>
                </Box>

                {/* Form Section */}
                <Box sx={{ flex: 1, p: { xs: 4, md: 8 }, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <MotionBox custom={0} variants={staggerVariants} initial="hidden" animate="visible" sx={{ mb: 5 }}>
                        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: 'white' }}>
                            Sign In
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            Welcome back! Please enter your details.
                        </Typography>
                    </MotionBox>

                    <AnimatePresence mode="wait">
                        {error && (
                            <MotionBox
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                sx={{ mb: 3 }}
                            >
                                <Alert
                                    severity="error"
                                    sx={{
                                        borderRadius: 3,
                                        bgcolor: 'rgba(211, 47, 47, 0.1)',
                                        color: '#ff8a80',
                                        border: '1px solid rgba(211, 47, 47, 0.2)'
                                    }}
                                >
                                    {error}
                                </Alert>
                            </MotionBox>
                        )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit}>
                        <MotionBox custom={1} variants={staggerVariants} initial="hidden" animate="visible">
                            <TextField
                                label="Email Address"
                                fullWidth
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                variant="filled"
                                InputProps={{
                                    disableUnderline: true,
                                    startAdornment: <EmailOutlined sx={{ mr: 2, color: 'primary.light' }} />,
                                    sx: {
                                        borderRadius: 3,
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        p: 1,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                                        '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.1)' }
                                    }
                                }}
                                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.4)', ml: 4 } }}
                            />
                        </MotionBox>

                        <MotionBox custom={2} variants={staggerVariants} initial="hidden" animate="visible">
                            <TextField
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                fullWidth
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                margin="normal"
                                variant="filled"
                                InputProps={{
                                    disableUnderline: true,
                                    startAdornment: <LockOutlined sx={{ mr: 2, color: 'primary.light' }} />,
                                    endAdornment: (
                                        <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ color: 'rgba(255,255,255,0.3)' }}>
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    ),
                                    sx: {
                                        borderRadius: 3,
                                        bgcolor: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        p: 1,
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                                        '&.Mui-focused': { bgcolor: 'rgba(255,255,255,0.1)' }
                                    }
                                }}
                                InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.4)', ml: 4 } }}
                            />
                        </MotionBox>

                        <MotionBox custom={3} variants={staggerVariants} initial="hidden" animate="visible" sx={{ mt: 2, mb: 4, textAlign: 'right' }}>
                            <Link component={RouterLink} to="/forgot-password" sx={{ color: 'primary.light', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                                Forgot Password?
                            </Link>
                        </MotionBox>

                        <MotionBox custom={4} variants={staggerVariants} initial="hidden" animate="visible">
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={loading}
                                endIcon={<ArrowForward />}
                                sx={{
                                    py: 2.2,
                                    borderRadius: 4,
                                    textTransform: 'none',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)',
                                    boxShadow: '0 10px 20px -10px rgba(46, 125, 50, 0.5)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
                                        transform: 'translateY(-2px)',
                                        boxShadow: '0 15px 25px -10px rgba(46, 125, 50, 0.6)',
                                    },
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                {loading ? 'Signing In...' : 'Sign In To Dashboard'}
                            </Button>
                        </MotionBox>
                    </form>

                    <MotionBox custom={5} variants={staggerVariants} initial="hidden" animate="visible" sx={{ mt: 5, textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                            Don't have an account?{' '}
                            <Link component={RouterLink} to="/signup" sx={{ color: 'primary.light', fontWeight: 800, textDecoration: 'none' }}>
                                Request Access
                            </Link>
                        </Typography>
                    </MotionBox>
                </Box>
            </MotionPaper>
        </Box>
    )
}
