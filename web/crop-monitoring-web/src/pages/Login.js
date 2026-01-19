import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Box,
    Card,
    CardContent,
    TextField,
    Button,
    Typography,
    Alert,
    Grid,
    InputAdornment,
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    Agriculture as AgricultureIcon,
} from '@mui/icons-material';

// Import slider images
import Slide1 from '../assets/images/login_slide_1.jpg';
import Slide2 from '../assets/images/login_slide_2.jpg';
import Slide3 from '../assets/images/login_slide_3.jpg';

const Login = () => {
    const images = [Slide1, Slide2, Slide3];
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 10000);
        return () => clearInterval(timer);
    }, [images.length]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await login(username, password);

        if (success) {
            navigate('/');
        } else {
            setError('Invalid username or password');
        }

        setLoading(false);
    };

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex' }}>
            <Grid container sx={{ flex: 1 }}>
                {/* Left Side - Image Slider Overlay */}
                <Grid
                    item
                    xs={12}
                    md={6}
                    sx={{
                        position: 'relative',
                        display: { xs: 'none', md: 'flex' },
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        p: 6,
                        overflow: 'hidden',
                        '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundImage: `url(${images[currentImageIndex]})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            transition: 'background-image 1.5s ease-in-out',
                            zIndex: -1,
                        },
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%)',
                            zIndex: 0,
                        }}
                    />
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h2" color="white" fontWeight="bold" gutterBottom>
                            Smart Farming,
                            <br />
                            Better Yields.
                        </Typography>
                        <Typography variant="h6" color="rgba(255,255,255,0.9)">
                            Advanced crop monitoring and management system for the modern age.
                        </Typography>
                    </Box>
                </Grid>

                {/* Right Side - Login Form */}
                <Grid
                    item
                    xs={12}
                    md={6}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'background.default',
                        p: 4,
                    }}
                >
                    <Card
                        sx={{
                            maxWidth: 450,
                            width: '100%',
                            boxShadow: 'none',
                            bgcolor: 'transparent',
                        }}
                    >
                        <CardContent sx={{ p: 0 }}>
                            <Box sx={{ mb: 4, textAlign: 'center' }}>
                                <Box
                                    sx={{
                                        display: 'inline-flex',
                                        p: 1.5,
                                        borderRadius: '50%',
                                        bgcolor: 'primary.light',
                                        mb: 2,
                                        color: 'white',
                                    }}
                                >
                                    <AgricultureIcon fontSize="large" />
                                </Box>
                                <Typography variant="h4" fontWeight="bold" color="text.primary" gutterBottom>
                                    Welcome Back
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Please sign in to access your dashboard.
                                </Typography>
                            </Box>

                            {error && (
                                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            <Box component="form" onSubmit={handleSubmit}>
                                <TextField
                                    fullWidth
                                    label="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    margin="normal"
                                    required
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <PersonIcon color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    label="Password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    margin="normal"
                                    required
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <LockIcon color="action" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={{ mb: 3 }}
                                />

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    disabled={loading}
                                    sx={{
                                        py: 1.5,
                                        fontSize: '1rem',
                                        textTransform: 'none',
                                        borderRadius: 2,
                                    }}
                                >
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Login;
