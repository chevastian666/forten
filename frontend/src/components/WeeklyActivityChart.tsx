import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Box, Typography, Stack, IconButton } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { format, subDays, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeeklyDataPoint {
  day: string;
  eventos: number;
  accesos: number;
  incidentes: number;
  fecha: string;
}

// Generate mock data for the last 7 days
const generateWeeklyData = (): WeeklyDataPoint[] => {
  const data: WeeklyDataPoint[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = startOfDay(subDays(now, i));
    const dayOfWeek = date.getDay();
    
    // Simulate weekly patterns
    let baseActivity = 10;
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Weekend - lower activity
      baseActivity = 5 + Math.random() * 8;
    } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Weekdays - higher activity
      baseActivity = 15 + Math.random() * 15;
    }

    data.push({
      day: format(date, 'EEE', { locale: es }).charAt(0).toUpperCase() + format(date, 'EEE', { locale: es }).slice(1, 3),
      eventos: Math.floor(baseActivity + Math.random() * 10),
      accesos: Math.floor(baseActivity * 0.8 + Math.random() * 8),
      incidentes: Math.floor(Math.random() * 3 + (dayOfWeek === 0 || dayOfWeek === 6 ? 0 : Math.random() * 2)),
      fecha: format(date, 'dd/MM/yyyy'),
    });
  }

  return data;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E0E0E0',
          borderRadius: 1,
          p: 2,
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Typography variant="body2" fontWeight="600" sx={{ mb: 1 }}>
          {data.fecha}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Typography
            key={index}
            variant="body2"
            sx={{ color: entry.color, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: entry.color,
              }}
            />
            {entry.name}: {entry.value}
          </Typography>
        ))}
      </Box>
    );
  }
  return null;
};

interface WeeklyActivityChartProps {
  height?: number;
}

export const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({ 
  height = 200 
}) => {
  const [data, setData] = React.useState(generateWeeklyData());

  const handleRefresh = () => {
    setData(generateWeeklyData());
  };

  const totalEvents = data.reduce((sum, item) => sum + item.eventos, 0);
  const avgDaily = Math.round(totalEvents / 7);

  return (
    <Box>
      {/* Header with refresh */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            Actividad Semanal
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Promedio diario: {avgDaily} eventos
          </Typography>
        </Box>
        <IconButton onClick={handleRefresh} size="small">
          <Refresh />
        </IconButton>
      </Stack>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis 
            dataKey="day" 
            stroke="#666666"
            fontSize={12}
            tick={{ fill: '#666666' }}
          />
          <YAxis 
            stroke="#666666"
            fontSize={12}
            tick={{ fill: '#666666' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="eventos"
            fill="#FF6B35"
            radius={[2, 2, 0, 0]}
            name="Eventos"
          />
          <Bar
            dataKey="accesos"
            fill="#4CAF50"
            radius={[2, 2, 0, 0]}
            name="Accesos"
          />
          <Bar
            dataKey="incidentes"
            fill="#F44336"
            radius={[2, 2, 0, 0]}
            name="Incidentes"
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Time indicator */}
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ 
          display: 'block', 
          textAlign: 'center', 
          mt: 1,
          fontStyle: 'italic'
        }}
      >
        Últimos 7 días
      </Typography>
    </Box>
  );
};