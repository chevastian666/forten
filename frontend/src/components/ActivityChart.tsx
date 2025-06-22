import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Box, Typography, Chip, Stack } from '@mui/material';
import { format, subHours, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface ActivityDataPoint {
  time: string;
  eventos: number;
  accesos: number;
  alarmas: number;
  timestamp: number;
}

// Generate mock data for the last 24 hours
const generateMockData = (): ActivityDataPoint[] => {
  const data: ActivityDataPoint[] = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const time = subHours(now, i);
    const hour = time.getHours();
    
    // Simulate realistic patterns
    let baseActivity = 0;
    if (hour >= 6 && hour <= 10) {
      // Morning peak
      baseActivity = 15 + Math.random() * 10;
    } else if (hour >= 11 && hour <= 14) {
      // Midday activity
      baseActivity = 8 + Math.random() * 6;
    } else if (hour >= 17 && hour <= 21) {
      // Evening peak
      baseActivity = 12 + Math.random() * 8;
    } else if (hour >= 22 || hour <= 5) {
      // Night time
      baseActivity = 1 + Math.random() * 3;
    } else {
      // Other hours
      baseActivity = 5 + Math.random() * 5;
    }

    data.push({
      time: format(time, 'HH:mm'),
      eventos: Math.floor(baseActivity + Math.random() * 5),
      accesos: Math.floor(baseActivity * 0.6 + Math.random() * 3),
      alarmas: Math.floor(Math.random() * 2 + (hour >= 22 || hour <= 5 ? 0 : Math.random())),
      timestamp: time.getTime(),
    });
  }

  return data;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
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
          {label}
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

interface ActivityChartProps {
  type?: 'line' | 'area';
  height?: number;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ 
  type = 'area', 
  height = 300 
}) => {
  const data = generateMockData();

  const totalEvents = data.reduce((sum, item) => sum + item.eventos, 0);
  const totalAccess = data.reduce((sum, item) => sum + item.accesos, 0);
  const totalAlarms = data.reduce((sum, item) => sum + item.alarmas, 0);

  return (
    <Box>
      {/* Summary Stats */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Chip
          label={`${totalEvents} Eventos`}
          sx={{
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            fontWeight: 500,
          }}
        />
        <Chip
          label={`${totalAccess} Accesos`}
          sx={{
            backgroundColor: '#4CAF50',
            color: '#FFFFFF',
            fontWeight: 500,
          }}
        />
        <Chip
          label={`${totalAlarms} Alarmas`}
          sx={{
            backgroundColor: '#F44336',
            color: '#FFFFFF',
            fontWeight: 500,
          }}
        />
      </Stack>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {type === 'line' ? (
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis 
              dataKey="time" 
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
            <Line
              type="monotone"
              dataKey="eventos"
              stroke="#FF6B35"
              strokeWidth={2}
              dot={{ fill: '#FF6B35', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#FF6B35', strokeWidth: 2 }}
              name="Eventos"
            />
            <Line
              type="monotone"
              dataKey="accesos"
              stroke="#4CAF50"
              strokeWidth={2}
              dot={{ fill: '#4CAF50', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#4CAF50', strokeWidth: 2 }}
              name="Accesos"
            />
            <Line
              type="monotone"
              dataKey="alarmas"
              stroke="#F44336"
              strokeWidth={2}
              dot={{ fill: '#F44336', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#F44336', strokeWidth: 2 }}
              name="Alarmas"
            />
          </LineChart>
        ) : (
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorEventos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF6B35" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorAccesos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="colorAlarmas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F44336" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F44336" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis 
              dataKey="time" 
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
            <Area
              type="monotone"
              dataKey="eventos"
              stackId="1"
              stroke="#FF6B35"
              strokeWidth={2}
              fill="url(#colorEventos)"
              name="Eventos"
            />
            <Area
              type="monotone"
              dataKey="accesos"
              stackId="2"
              stroke="#4CAF50"
              strokeWidth={2}
              fill="url(#colorAccesos)"
              name="Accesos"
            />
            <Area
              type="monotone"
              dataKey="alarmas"
              stackId="3"
              stroke="#F44336"
              strokeWidth={2}
              fill="url(#colorAlarmas)"
              name="Alarmas"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>

      {/* Time Range Indicator */}
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
        Actividad de las últimas 24 horas • Actualizado en tiempo real
      </Typography>
    </Box>
  );
};