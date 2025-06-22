'use client';

import { MetricGroup, Metric } from '@/services/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Shield,
  DollarSign,
  Wrench,
  Activity,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricsGridProps {
  metrics?: MetricGroup;
  analytics?: any;
  className?: string;
}

export function MetricsGrid({ metrics, analytics, className }: MetricsGridProps) {
  const getIcon = (metricId: string) => {
    const icons: Record<string, any> = {
      'total-access': Users,
      'active-alerts': Shield,
      'response-time': Clock,
      'total-residents': Users,
      'satisfaction': CheckCircle2,
      'app-usage': Activity,
      'revenue': DollarSign,
      'collection-rate': DollarSign,
      'net-income': DollarSign,
      'total-requests': Wrench,
      'pending-requests': Clock,
      'avg-resolution-time': Clock,
      'satisfaction-rating': CheckCircle2
    };
    
    const IconComponent = icons[metricId] || Activity;
    return <IconComponent className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const formatValue = (metric: Metric) => {
    if (metric.unit === 'USD' || metric.unit === '$') {
      return `$${metric.value.toLocaleString('es-UY')}`;
    }
    
    if (metric.unit === '%') {
      return `${metric.value}%`;
    }
    
    if (metric.unit) {
      return `${metric.value} ${metric.unit}`;
    }
    
    return metric.value.toLocaleString('es-UY');
  };

  const getChangeColor = (metric: Metric) => {
    // For some metrics, a decrease is good (like response time, alerts)
    const inverseMetrics = ['active-alerts', 'response-time', 'pending-requests', 'avg-resolution-time'];
    const isInverse = inverseMetrics.includes(metric.id);
    
    if (metric.trend === 'up') {
      return isInverse ? 'text-red-600' : 'text-green-600';
    } else if (metric.trend === 'down') {
      return isInverse ? 'text-green-600' : 'text-red-600';
    }
    
    return 'text-gray-600';
  };

  const getProgressValue = (metric: Metric) => {
    // For percentage metrics, use the value directly
    if (metric.unit === '%') {
      return metric.value;
    }
    
    // For other metrics, calculate based on change
    if (metric.previousValue && metric.previousValue > 0) {
      return (metric.value / metric.previousValue) * 100;
    }
    
    return 0;
  };

  if (!metrics || !metrics.metrics) {
    return null;
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {metrics.metrics.map((metric) => (
        <Card key={metric.id} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
            {getIcon(metric.id)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatValue(metric)}</div>
            
            {metric.changePercentage !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className={cn("flex items-center gap-1", getChangeColor(metric))}>
                  {getTrendIcon(metric.trend)}
                  <span className="text-xs font-medium">
                    {Math.abs(metric.changePercentage)}%
                  </span>
                </div>
                {metric.previousValue !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    vs {metric.unit === 'USD' || metric.unit === '$' 
                      ? `$${metric.previousValue.toLocaleString('es-UY')}` 
                      : metric.previousValue}
                  </span>
                )}
              </div>
            )}
            
            {metric.unit === '%' && (
              <Progress 
                value={metric.value} 
                className="mt-2 h-1"
              />
            )}
          </CardContent>
          
          {/* Decorative gradient based on trend */}
          <div 
            className={cn(
              "absolute inset-x-0 bottom-0 h-1",
              metric.trend === 'up' && "bg-gradient-to-r from-green-500 to-green-600",
              metric.trend === 'down' && "bg-gradient-to-r from-red-500 to-red-600",
              metric.trend === 'stable' && "bg-gradient-to-r from-gray-400 to-gray-500"
            )}
          />
        </Card>
      ))}
    </div>
  );
}