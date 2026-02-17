import { useMemo } from 'react';
import {
    Typography,
    Box,
    useTheme,
    alpha,
} from '@mui/material';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Line,
    ComposedChart,
    Bar,
} from 'recharts';
import { FullObservation } from '@/types/database.types';
import { format } from 'date-fns';

interface FertilizerPerformanceChartProps {
    data: FullObservation[];
}

export const FertilizerPerformanceChart: React.FC<FertilizerPerformanceChartProps> = ({ data }) => {
    const theme = useTheme();

    const chartData = useMemo(() => {
        return data
            .filter(obs => obs.nutrient_management?.application_rate && (obs.crop_monitoring?.canopy_cover || obs.harvest?.yield))
            .map(obs => ({
                name: obs.field_name,
                rate: obs.nutrient_management?.application_rate,
                canopy: obs.crop_monitoring?.canopy_cover || 0,
                yield: obs.harvest?.yield || 0,
                date: format(new Date(obs.nutrient_management?.application_date || obs.date_recorded), 'MMM dd'),
                variety: obs.crop_information?.variety,
                fertilizer: obs.nutrient_management?.fertilizer_type,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [data]);

    if (chartData.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, bgcolor: alpha(theme.palette.background.paper, 0.05), borderRadius: 4 }}>
                <Typography color="text.secondary">No performance data available for selected filters</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: 450 }}>
            <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>
                Fertilizer vs Crop Performance
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
                <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="rate"
                        name="Rate"
                        unit="kg/ha"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    />
                    <YAxis
                        yAxisId="left"
                        name="Canopy"
                        unit="%"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    />
                    <YAxis
                        yAxisId="right"
                        orientation="right"
                        name="Yield"
                        unit="t/ha"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const d = payload[0].payload;
                                return (
                                    <Box sx={{ p: 2, bgcolor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3 }}>
                                        <Typography variant="subtitle2" fontWeight={800} color="primary.light">{d.name}</Typography>
                                        <Typography variant="caption" display="block" color="text.secondary">Variety: {d.variety}</Typography>
                                        <Typography variant="caption" display="block" color="text.secondary">Fertilizer: {d.fertilizer}</Typography>
                                        <Box sx={{ mt: 1, borderTop: '1px solid rgba(255,255,255,0.05)', pt: 1 }}>
                                            <Typography variant="body2">Rate: {d.rate} kg/ha</Typography>
                                            <Typography variant="body2">Canopy: {d.canopy}%</Typography>
                                            <Typography variant="body2">Yield: {d.yield} t/ha</Typography>
                                        </Box>
                                    </Box>
                                );
                            }
                            return null;
                        }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                    <Bar yAxisId="left" dataKey="canopy" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} name="Canopy Cover %" barSize={30} />
                    <Line yAxisId="right" type="monotone" dataKey="yield" stroke={theme.palette.secondary.main} strokeWidth={3} dot={{ r: 4 }} name="Yield (t/ha)" />
                </ComposedChart>
            </ResponsiveContainer>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary', fontStyle: 'italic', textAlign: 'center' }}>
                * Note: Observed correlation between fertilizer application rate and crop yield may be influenced by external environmental variables (rainfall, soil type, and seed variety).
            </Typography>
        </Box>
    );
};
