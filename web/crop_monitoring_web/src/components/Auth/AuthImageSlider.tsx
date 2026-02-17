import { useState, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'

import sugarcane1 from '@/assets/sugarcane_1.png'
import sugarcane2 from '@/assets/sugarcane_2.png'
import sugarcane3 from '@/assets/sugarcane_3.png'
import sugarcane4 from '@/assets/sugarcane_4.png'
import sugarcane5 from '@/assets/sugarcane_5.png'

const images = [sugarcane1, sugarcane2, sugarcane3, sugarcane4, sugarcane5]

const messages = [
    "Precision in Every Seed.",
    "Sustainable Growth.",
    "Smart Harvesting.",
    "AI-Powered Insights.",
    "The Future of Farming."
]

export function AuthImageSlider() {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <Box sx={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${images[index]})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
            </AnimatePresence>

            {/* Gradient Overlay */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(15, 23, 42, 0.8) 100%)',
                    zIndex: 1
                }}
            />

            {/* Content Over Image */}
            <Box sx={{ position: 'absolute', bottom: 60, left: 40, right: 40, zIndex: 2 }}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.8 }}
                    >
                        <Typography variant="h3" fontWeight={800} sx={{ color: 'white', mb: 1, lineHeight: 1.1 }}>
                            {messages[index].split(' ').map((word, i) => (
                                <span key={i} style={word.toLowerCase() === 'farming.' || word.toLowerCase() === 'insights.' || word.toLowerCase() === 'harvesting.' || word.toLowerCase() === 'growth.' || word.toLowerCase() === 'seed.' ? { color: '#81c784' } : {}}>
                                    {word}{' '}
                                </span>
                            ))}
                        </Typography>
                    </motion.div>
                </AnimatePresence>
            </Box>
        </Box>
    )
}
