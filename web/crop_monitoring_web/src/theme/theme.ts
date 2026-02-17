import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#2e7d32', // Deep Emerald
            light: '#81c784', // Mint Sugarcane
            dark: '#1b5e20', // Forest
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#43a047', // Succulent Green
            light: '#a5d6a7',
            dark: '#2e7d32',
            contrastText: '#ffffff',
        },
        background: {
            default: '#0f172a', // Midnight Slate
            paper: 'rgba(30, 41, 59, 0.7)', // Translucent Slate
        },
        text: {
            primary: '#f8fafc',
            secondary: '#94a3b8',
        },
        divider: 'rgba(255, 255, 255, 0.08)',
    },
    typography: {
        fontFamily: '"Outfit", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: { fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.02em' },
        h2: { fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.01em' },
        h3: { fontSize: '1.875rem', fontWeight: 800 },
        h4: { fontSize: '1.5rem', fontWeight: 700 },
        h5: { fontSize: '1.25rem', fontWeight: 600 },
        h6: { fontSize: '1rem', fontWeight: 600 },
        body1: { fontSize: '1rem', lineHeight: 1.6 },
        body2: { fontSize: '0.875rem', lineHeight: 1.57 },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    scrollbarColor: "#2e7d32 #0f172a",
                    "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
                        width: 8,
                    },
                    "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
                        borderRadius: 8,
                        backgroundColor: "#2e7d32",
                        minHeight: 24,
                        border: "3px solid #0f172a",
                    },
                    "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
                        backgroundColor: "#81c784",
                    },
                    "&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active": {
                        backgroundColor: "#81c784",
                    },
                    "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
                        backgroundColor: "#81c784",
                    },
                    "&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track": {
                        backgroundColor: "#0f172a",
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 12,
                    padding: '10px 24px',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        transform: 'translateY(-1px)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #2e7d32 0%, #43a047 100%)',
                    boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
                        boxShadow: '0 6px 20px rgba(46, 125, 50, 0.23)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 20,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    background: 'rgba(30, 41, 59, 0.4)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#0f172a',
                    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
                },
            },
        },
    },
})
