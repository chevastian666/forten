import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration, ChartType } from 'chart.js';
import { Logger } from '@infrastructure/logging/Logger';

export interface ChartOptions {
  title: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  theme?: 'light' | 'dark';
}

export interface LineChartOptions extends ChartOptions {
  data: any[];
  xField: string;
  yField: string | string[];
  smooth?: boolean;
  showPoints?: boolean;
  showArea?: boolean;
}

export interface BarChartOptions extends ChartOptions {
  data: any[];
  xField: string;
  yFields: string[];
  horizontal?: boolean;
  stacked?: boolean;
}

export interface PieChartOptions extends ChartOptions {
  data: any[];
  labelField: string;
  valueField: string;
  showLegend?: boolean;
  showPercentages?: boolean;
}

export interface ScatterChartOptions extends ChartOptions {
  data: any[];
  xField: string;
  yField: string;
  sizeField?: string;
  colorField?: string;
}

export class ChartGenerationService {
  private chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor(private readonly logger: Logger) {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 600,
      backgroundColour: 'white',
      chartCallback: (ChartJS) => {
        // Register any plugins or custom configurations
        ChartJS.defaults.font.family = 'Arial, sans-serif';
      }
    });
  }

  async generateLineChart(options: LineChartOptions): Promise<Buffer> {
    const { data, xField, yField, title, width = 800, height = 400, smooth = true, showArea = false } = options;

    const labels = data.map(d => this.formatLabel(d[xField]));
    const datasets = Array.isArray(yField) ? 
      yField.map((field, index) => ({
        label: this.formatFieldName(field),
        data: data.map(d => d[field]),
        borderColor: this.getColor(index),
        backgroundColor: showArea ? this.getColor(index, 0.2) : 'transparent',
        tension: smooth ? 0.4 : 0,
        fill: showArea,
        pointRadius: options.showPoints !== false ? 4 : 0,
        pointHoverRadius: 6
      })) :
      [{
        label: this.formatFieldName(yField),
        data: data.map(d => d[yField]),
        borderColor: this.getColor(0),
        backgroundColor: showArea ? this.getColor(0, 0.2) : 'transparent',
        tension: smooth ? 0.4 : 0,
        fill: showArea,
        pointRadius: options.showPoints !== false ? 4 : 0,
        pointHoverRadius: 6
      }];

    const configuration: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: datasets.length > 1,
            position: 'bottom'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
  }

  async generateBarChart(options: BarChartOptions): Promise<Buffer> {
    const { data, xField, yFields, title, width = 800, height = 400, horizontal = false, stacked = false } = options;

    const labels = data.map(d => this.formatLabel(d[xField]));
    const datasets = yFields.map((field, index) => ({
      label: this.formatFieldName(field),
      data: data.map(d => d[field]),
      backgroundColor: this.getColor(index, 0.8),
      borderColor: this.getColor(index),
      borderWidth: 1
    }));

    const configuration: ChartConfiguration = {
      type: 'bar',
      data: {
        labels,
        datasets
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: datasets.length > 1,
            position: 'bottom'
          }
        },
        scales: {
          x: {
            stacked,
            grid: {
              display: !horizontal
            }
          },
          y: {
            stacked,
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          }
        }
      }
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
  }

  async generatePieChart(options: PieChartOptions): Promise<Buffer> {
    const { data, labelField, valueField, title, width = 600, height = 400, showLegend = true, showPercentages = true } = options;

    const labels = data.map(d => this.formatLabel(d[labelField]));
    const values = data.map(d => d[valueField]);
    const total = values.reduce((sum, val) => sum + val, 0);

    const configuration: ChartConfiguration = {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: data.map((_, index) => this.getColor(index, 0.8)),
          borderColor: data.map((_, index) => this.getColor(index)),
          borderWidth: 2
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: showLegend,
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const percentage = ((value / total) * 100).toFixed(1);
                return showPercentages ? 
                  `${label}: ${value} (${percentage}%)` : 
                  `${label}: ${value}`;
              }
            }
          }
        }
      }
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
  }

  async generateDoughnutChart(options: PieChartOptions): Promise<Buffer> {
    const { data, labelField, valueField, title, width = 600, height = 400, showLegend = true } = options;

    const labels = data.map(d => this.formatLabel(d[labelField]));
    const values = data.map(d => d[valueField]);

    const configuration: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: data.map((_, index) => this.getColor(index, 0.8)),
          borderColor: data.map((_, index) => this.getColor(index)),
          borderWidth: 2
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: showLegend,
            position: 'right'
          }
        }
      }
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
  }

  async generateScatterChart(options: ScatterChartOptions): Promise<Buffer> {
    const { data, xField, yField, sizeField, title, width = 800, height = 600 } = options;

    const scatterData = data.map(d => ({
      x: d[xField],
      y: d[yField],
      r: sizeField ? Math.sqrt(d[sizeField]) * 2 : 5
    }));

    const configuration: ChartConfiguration = {
      type: 'bubble',
      data: {
        datasets: [{
          label: `${this.formatFieldName(yField)} vs ${this.formatFieldName(xField)}`,
          data: scatterData,
          backgroundColor: this.getColor(0, 0.6),
          borderColor: this.getColor(0),
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: this.formatFieldName(xField)
            }
          },
          y: {
            title: {
              display: true,
              text: this.formatFieldName(yField)
            }
          }
        }
      }
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
  }

  async generateHeatmap(options: {
    data: any[];
    xField: string;
    yField: string;
    valueField: string;
    title: string;
    width?: number;
    height?: number;
  }): Promise<Buffer> {
    const { data, xField, yField, valueField, title, width = 800, height = 600 } = options;

    // Group data by x and y
    const matrix: Record<string, Record<string, number>> = {};
    const xLabels = new Set<string>();
    const yLabels = new Set<string>();

    data.forEach(d => {
      const x = String(d[xField]);
      const y = String(d[yField]);
      xLabels.add(x);
      yLabels.add(y);
      
      if (!matrix[y]) matrix[y] = {};
      matrix[y][x] = d[valueField];
    });

    const xArray = Array.from(xLabels);
    const yArray = Array.from(yLabels);

    // Convert to chart data
    const chartData: any[] = [];
    yArray.forEach((y, yIndex) => {
      xArray.forEach((x, xIndex) => {
        chartData.push({
          x: xIndex,
          y: yIndex,
          v: matrix[y]?.[x] || 0
        });
      });
    });

    const maxValue = Math.max(...chartData.map(d => d.v));
    const minValue = Math.min(...chartData.map(d => d.v));

    const configuration: ChartConfiguration = {
      type: 'scatter',
      data: {
        datasets: [{
          label: valueField,
          data: chartData,
          backgroundColor: (context) => {
            const value = context.raw as any;
            const alpha = (value.v - minValue) / (maxValue - minValue);
            return `rgba(54, 162, 235, ${alpha})`;
          },
          pointRadius: 15
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const point = context.raw as any;
                return `${yArray[point.y]}, ${xArray[point.x]}: ${point.v}`;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'category',
            labels: xArray,
            title: {
              display: true,
              text: this.formatFieldName(xField)
            }
          },
          y: {
            type: 'category',
            labels: yArray,
            title: {
              display: true,
              text: this.formatFieldName(yField)
            }
          }
        }
      }
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
  }

  async generateGaugeChart(options: {
    value: number;
    min?: number;
    max?: number;
    title: string;
    thresholds?: { value: number; color: string }[];
    width?: number;
    height?: number;
  }): Promise<Buffer> {
    const { value, min = 0, max = 100, title, thresholds, width = 400, height = 300 } = options;

    // Gauge chart using doughnut with rotation
    const percentage = ((value - min) / (max - min)) * 100;
    const remainingPercentage = 100 - percentage;

    let backgroundColor = this.getColor(0);
    if (thresholds) {
      for (const threshold of thresholds.sort((a, b) => b.value - a.value)) {
        if (value >= threshold.value) {
          backgroundColor = threshold.color;
          break;
        }
      }
    }

    const configuration: ChartConfiguration = {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [percentage, remainingPercentage],
          backgroundColor: [backgroundColor, 'rgba(200, 200, 200, 0.3)'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: title,
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        }
      },
      plugins: [{
        id: 'text',
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          const width = chart.width;
          const height = chart.height;

          ctx.restore();
          ctx.font = 'bold 24px Arial';
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';

          const text = value.toFixed(1);
          const textX = width / 2;
          const textY = height - 50;

          ctx.fillText(text, textX, textY);
          ctx.save();
        }
      }]
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration, 'image/png');
  }

  private formatLabel(value: any): string {
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  }

  private formatFieldName(field: string): string {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  private getColor(index: number, alpha: number = 1): string {
    const colors = [
      `rgba(54, 162, 235, ${alpha})`,   // Blue
      `rgba(255, 99, 132, ${alpha})`,   // Red
      `rgba(75, 192, 192, ${alpha})`,   // Green
      `rgba(255, 206, 86, ${alpha})`,   // Yellow
      `rgba(153, 102, 255, ${alpha})`,  // Purple
      `rgba(255, 159, 64, ${alpha})`,   // Orange
      `rgba(46, 204, 113, ${alpha})`,   // Emerald
      `rgba(52, 152, 219, ${alpha})`,   // Peter River
      `rgba(155, 89, 182, ${alpha})`,   // Amethyst
      `rgba(52, 73, 94, ${alpha})`      // Wet Asphalt
    ];
    return colors[index % colors.length];
  }
}