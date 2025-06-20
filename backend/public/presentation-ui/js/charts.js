// FORTEN CRM - Charts Configuration
// Real-time charts for dashboard presentation

// Corporate colors
const colors = {
    primary: '#FF6B35',
    primaryLight: '#FF8A5B',
    primaryDark: '#E55A2B',
    black: '#1a1a1a',
    white: '#FFFFFF',
    success: '#28A745',
    warning: '#FFC107',
    danger: '#DC3545',
    info: '#17A2B8',
    gray: '#6C757D',
    lightGray: '#F8F9FA'
};

// Chart.js global configuration
Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.color = colors.black;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;

// Real-time Access Chart
function initAccessChart() {
    const ctx = document.getElementById('accessChart');
    if (!ctx) return;

    // Generate real-time data for the last 24 hours
    const now = new Date();
    const labels = [];
    const accessData = [];
    const alertData = [];

    for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        labels.push(time.getHours().toString().padStart(2, '0') + ':00');
        
        // Simulate realistic access patterns
        let baseAccess = 20;
        const hour = time.getHours();
        
        // Peak hours: 8-10 AM and 5-7 PM
        if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19)) {
            baseAccess = Math.floor(Math.random() * 40) + 60;
        } else if (hour >= 6 && hour <= 22) {
            baseAccess = Math.floor(Math.random() * 30) + 25;
        } else {
            baseAccess = Math.floor(Math.random() * 10) + 5;
        }
        
        accessData.push(baseAccess);
        
        // Random alerts (fewer)
        alertData.push(Math.floor(Math.random() * 3));
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Accesos por Hora',
                data: accessData,
                borderColor: colors.primary,
                backgroundColor: colors.primary + '20',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: colors.primary,
                pointBorderColor: colors.white,
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }, {
                label: 'Alertas de Seguridad',
                data: alertData,
                borderColor: colors.danger,
                backgroundColor: colors.danger + '20',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: colors.danger,
                pointBorderColor: colors.white,
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: colors.black,
                    titleColor: colors.white,
                    bodyColor: colors.white,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(context) {
                            return 'Hora: ' + context[0].label;
                        },
                        label: function(context) {
                            const label = context.dataset.label;
                            const value = context.raw;
                            return label + ': ' + value + (label.includes('Accesos') ? ' accesos' : ' alertas');
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Hora del Día',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        color: colors.gray
                    },
                    grid: {
                        display: true,
                        color: colors.lightGray + '80'
                    },
                    ticks: {
                        color: colors.gray,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Cantidad',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        color: colors.gray
                    },
                    grid: {
                        display: true,
                        color: colors.lightGray + '80'
                    },
                    ticks: {
                        color: colors.gray,
                        font: {
                            size: 11
                        },
                        beginAtZero: true
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            elements: {
                point: {
                    hoverBackgroundColor: colors.white,
                    hoverBorderWidth: 3
                }
            }
        }
    });
}

// Weekly Summary Chart
function initWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;

    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    // Generate realistic weekly data
    const visitorsData = [245, 312, 289, 267, 198, 156, 89];
    const accessData = [1847, 2156, 2034, 1923, 1567, 1234, 678];
    const alertsData = [5, 8, 3, 6, 2, 1, 1];

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: weekDays,
            datasets: [{
                label: 'Visitantes',
                data: visitorsData,
                backgroundColor: colors.primary + 'CC',
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
                yAxisID: 'y'
            }, {
                label: 'Accesos Totales',
                data: accessData,
                backgroundColor: colors.success + 'CC',
                borderColor: colors.success,
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
                yAxisID: 'y1'
            }, {
                label: 'Alertas',
                data: alertsData,
                type: 'line',
                borderColor: colors.danger,
                backgroundColor: colors.danger + '40',
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointBackgroundColor: colors.danger,
                pointBorderColor: colors.white,
                pointBorderWidth: 2,
                pointRadius: 6,
                yAxisID: 'y2'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: colors.black,
                    titleColor: colors.white,
                    bodyColor: colors.white,
                    borderColor: colors.primary,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            const label = context.dataset.label;
                            const value = context.raw.toLocaleString();
                            
                            if (label === 'Visitantes') {
                                return label + ': ' + value + ' personas';
                            } else if (label === 'Accesos Totales') {
                                return label + ': ' + value + ' accesos';
                            } else {
                                return label + ': ' + value + ' alertas';
                            }
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Días de la Semana',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        color: colors.gray
                    },
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: colors.gray,
                        font: {
                            size: 11
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Visitantes',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        color: colors.primary
                    },
                    grid: {
                        display: true,
                        color: colors.lightGray + '80'
                    },
                    ticks: {
                        color: colors.primary,
                        font: {
                            size: 11
                        },
                        beginAtZero: true
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Accesos',
                        font: {
                            size: 12,
                            weight: '600'
                        },
                        color: colors.success
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        color: colors.success,
                        font: {
                            size: 11
                        },
                        beginAtZero: true
                    }
                },
                y2: {
                    type: 'linear',
                    display: false,
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        beginAtZero: true,
                        max: 10
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// Real-time data simulation
function simulateRealTimeData() {
    // Update charts every 30 seconds with new data
    setInterval(() => {
        // Add animation effects to stats
        animateStatsNumbers();
        
        // Add pulse effect to status indicators
        const statusDots = document.querySelectorAll('.status-dot');
        statusDots.forEach(dot => {
            dot.style.animation = 'none';
            setTimeout(() => {
                dot.style.animation = 'pulse 2s infinite';
            }, 10);
        });
        
        // Simulate notification updates
        updateNotificationBadge();
        
    }, 30000);
}

// Animate statistics numbers
function animateStatsNumbers() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(element => {
        const currentValue = parseInt(element.textContent.replace(/[^\d]/g, ''));
        const variation = Math.floor(Math.random() * 10) - 5; // -5 to +5 variation
        const newValue = Math.max(0, currentValue + variation);
        
        // Animate number change
        element.style.transform = 'scale(1.1)';
        element.style.color = colors.primary;
        
        setTimeout(() => {
            if (element.textContent.includes('%')) {
                element.textContent = newValue + '%';
            } else {
                element.textContent = newValue.toLocaleString();
            }
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
                element.style.color = '';
            }, 200);
        }, 300);
    });
}

// Update notification badge
function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
        const currentCount = parseInt(badge.textContent);
        const randomChange = Math.random() > 0.7; // 30% chance of change
        
        if (randomChange) {
            const newCount = Math.max(0, currentCount + (Math.random() > 0.5 ? 1 : -1));
            badge.textContent = newCount;
            
            if (newCount > currentCount) {
                badge.style.animation = 'pulse 1s ease';
                setTimeout(() => {
                    badge.style.animation = '';
                }, 1000);
            }
        }
    }
    
    // Update notification dot
    const notificationDot = document.querySelector('.notification-dot');
    if (notificationDot) {
        notificationDot.style.animation = 'pulse 1s ease';
        setTimeout(() => {
            notificationDot.style.animation = '';
        }, 1000);
    }
}

// Initialize all charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for the page to fully render
    setTimeout(() => {
        initAccessChart();
        initWeeklyChart();
        simulateRealTimeData();
        
        // Initial animation for stats
        setTimeout(animateStatsNumbers, 1000);
    }, 500);
});

// Export functions for external use
window.ChartsModule = {
    initAccessChart,
    initWeeklyChart,
    simulateRealTimeData,
    animateStatsNumbers,
    colors
};