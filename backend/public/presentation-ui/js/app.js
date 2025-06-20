// FORTEN CRM - Main Application JavaScript
// Interactive features and real-time updates for presentation

class FortenApp {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.sidebarOpen = false;
        this.currentView = 'dashboard';
        this.realTimeInterval = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupMobileMenu();
        this.startRealTimeUpdates();
        this.setupNotifications();
        this.setupSearch();
        this.setupQuickActions();
        this.addPresentationFeatures();
        
        console.log('FORTEN CRM Dashboard initialized');
    }
    
    // Event Listeners Setup
    setupEventListeners() {
        // Menu toggle for mobile
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Sidebar menu items
        const menuItems = document.querySelectorAll('.menu-link');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => this.handleMenuClick(e));
        });
        
        // Quick action buttons
        const actionButtons = document.querySelectorAll('.action-button');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleQuickAction(e));
        });
        
        // Card action buttons
        const cardButtons = document.querySelectorAll('.btn-icon, .btn-small');
        cardButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleCardAction(e));
        });
        
        // Notification button
        const notificationBtn = document.querySelector('.notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => this.showNotifications());
        }
        
        // Search functionality
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.handleSearch(e));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(e.target.value);
                }
            });
        }
        
        // Window resize handler
        window.addEventListener('resize', () => this.handleResize());
        
        // Click outside sidebar to close on mobile
        document.addEventListener('click', (e) => {
            if (this.isMobile && this.sidebarOpen && !e.target.closest('.sidebar') && !e.target.closest('.menu-toggle')) {
                this.toggleSidebar();
            }
        });
    }
    
    // Mobile Menu Setup
    setupMobileMenu() {
        const sidebar = document.querySelector('.sidebar');
        if (this.isMobile && sidebar) {
            sidebar.classList.add('mobile');
        }
    }
    
    // Sidebar Toggle
    toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            this.sidebarOpen = !this.sidebarOpen;
            sidebar.classList.toggle('open', this.sidebarOpen);
            
            // Add overlay on mobile
            if (this.isMobile) {
                if (this.sidebarOpen) {
                    this.createOverlay();
                } else {
                    this.removeOverlay();
                }
            }
        }
    }
    
    // Create overlay for mobile sidebar
    createOverlay() {
        if (document.querySelector('.sidebar-overlay')) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            animation: fadeIn 0.3s ease;
        `;
        
        overlay.addEventListener('click', () => this.toggleSidebar());
        document.body.appendChild(overlay);
    }
    
    // Remove overlay
    removeOverlay() {
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    // Handle menu clicks
    handleMenuClick(e) {
        e.preventDefault();
        
        // Remove active class from all menu items
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        const menuItem = e.target.closest('.menu-item');
        if (menuItem) {
            menuItem.classList.add('active');
            
            // Get the view name from href
            const href = e.target.getAttribute('href');
            const view = href ? href.replace('#', '') : 'dashboard';
            this.switchView(view);
        }
        
        // Close sidebar on mobile after menu click
        if (this.isMobile && this.sidebarOpen) {
            this.toggleSidebar();
        }
    }
    
    // Switch views (for presentation purposes)
    switchView(view) {
        this.currentView = view;
        
        // Update page title
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            const titles = {
                'dashboard': 'Dashboard Principal',
                'access-control': 'Control de Acceso',
                'visitors': 'Gestión de Visitantes',
                'security': 'Centro de Seguridad',
                'reports': 'Reportes y Análisis',
                'notifications': 'Centro de Notificaciones',
                'settings': 'Configuración del Sistema'
            };
            
            pageTitle.textContent = titles[view] || 'Dashboard Principal';
            
            // Add animation effect
            pageTitle.style.opacity = '0.5';
            setTimeout(() => {
                pageTitle.style.opacity = '1';
            }, 150);
        }
        
        // Show toast notification for view change (presentation effect)
        this.showToast(`Navegando a: ${pageTitle?.textContent || view}`, 'info');
        
        console.log(`Switched to view: ${view}`);
    }
    
    // Handle quick actions
    handleQuickAction(e) {
        const button = e.target.closest('.action-button');
        if (!button) return;
        
        const action = button.textContent.trim();
        
        // Add click animation
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);
        
        // Handle different actions
        switch(true) {
            case action.includes('Registrar Visitante'):
                this.showVisitorRegistrationModal();
                break;
            case action.includes('Abrir Puerta'):
                this.openDoor();
                break;
            case action.includes('Activar Alerta'):
                this.activateAlert();
                break;
            case action.includes('Exportar Reporte'):
                this.exportReport();
                break;
            default:
                this.showToast(`Acción: ${action}`, 'info');
        }
    }
    
    // Handle card actions
    handleCardAction(e) {
        const button = e.target.closest('button');
        if (!button) return;
        
        // Add ripple effect
        this.addRippleEffect(button, e);
        
        // Handle specific actions
        if (button.classList.contains('btn-small')) {
            const text = button.textContent.trim();
            if (text === 'Ver todos' || text === 'Ver todas') {
                this.showToast('Abriendo vista detallada...', 'info');
            }
        }
    }
    
    // Real-time updates
    startRealTimeUpdates() {
        this.realTimeInterval = setInterval(() => {
            this.updateVisitorList();
            this.updateSecurityAlerts();
            this.updateSystemStatus();
            this.simulateNewActivity();
        }, 15000); // Update every 15 seconds
    }
    
    // Update visitor list with new entries
    updateVisitorList() {
        const visitorList = document.querySelector('.visitor-list');
        if (!visitorList) return;
        
        // Simulate new visitor every few updates
        if (Math.random() > 0.7) {
            const newVisitor = this.createVisitorElement({
                name: this.getRandomName(),
                company: this.getRandomCompany(),
                time: 'Ahora',
                status: 'active',
                avatar: this.generateAvatar()
            });
            
            // Add with animation
            newVisitor.style.opacity = '0';
            newVisitor.style.transform = 'translateY(-20px)';
            visitorList.insertBefore(newVisitor, visitorList.firstChild);
            
            setTimeout(() => {
                newVisitor.style.transition = 'all 0.5s ease';
                newVisitor.style.opacity = '1';
                newVisitor.style.transform = 'translateY(0)';
            }, 100);
            
            // Remove last visitor if too many
            const visitors = visitorList.querySelectorAll('.visitor-item');
            if (visitors.length > 5) {
                const lastVisitor = visitors[visitors.length - 1];
                lastVisitor.style.transition = 'all 0.3s ease';
                lastVisitor.style.opacity = '0';
                lastVisitor.style.transform = 'translateX(100px)';
                setTimeout(() => lastVisitor.remove(), 300);
            }
        }
    }
    
    // Update security alerts
    updateSecurityAlerts() {
        if (Math.random() > 0.8) { // 20% chance of new alert
            const alertList = document.querySelector('.alert-list');
            if (!alertList) return;
            
            const newAlert = this.createAlertElement({
                type: this.getRandomAlertType(),
                title: this.getRandomAlertTitle(),
                description: this.getRandomAlertDescription(),
                time: 'Ahora'
            });
            
            // Add with animation
            newAlert.style.opacity = '0';
            newAlert.style.transform = 'translateX(-30px)';
            alertList.insertBefore(newAlert, alertList.firstChild);
            
            setTimeout(() => {
                newAlert.style.transition = 'all 0.5s ease';
                newAlert.style.opacity = '1';
                newAlert.style.transform = 'translateX(0)';
            }, 100);
            
            // Update notification badge
            this.incrementNotificationBadge();
            
            // Show toast for high priority alerts
            if (newAlert.classList.contains('high')) {
                this.showToast('Nueva alerta de seguridad detectada', 'warning');
            }
        }
    }
    
    // Update system status
    updateSystemStatus() {
        const statusItems = document.querySelectorAll('.status-item');
        statusItems.forEach(item => {
            const statusNumber = item.querySelector('.status-number');
            if (statusNumber && Math.random() > 0.9) { // 10% chance
                // Simulate minor changes in status
                statusNumber.style.color = '#FF6B35';
                setTimeout(() => {
                    statusNumber.style.color = '';
                }, 1000);
            }
        });
    }
    
    // Simulate new activity
    simulateNewActivity() {
        // Pulse effect for active elements
        const activeBadges = document.querySelectorAll('.status-badge.active');
        activeBadges.forEach(badge => {
            badge.style.animation = 'pulse 0.5s ease';
            setTimeout(() => {
                badge.style.animation = '';
            }, 500);
        });
    }
    
    // Notification functions
    setupNotifications() {
        // Create notification container if it doesn't exist
        if (!document.querySelector('.notification-container')) {
            const container = document.createElement('div');
            container.className = 'notification-container';
            container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }
    }
    
    showNotifications() {
        this.showToast('Centro de notificaciones abierto', 'info');
        // In a real app, this would open a notification panel
    }
    
    showToast(message, type = 'info') {
        const container = document.querySelector('.notification-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const colors = {
            success: '#28A745',
            error: '#DC3545',
            warning: '#FFC107',
            info: '#FF6B35'
        };
        
        toast.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            min-width: 300px;
            max-width: 400px;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto dismiss
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        });
    }
    
    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || icons.info;
    }
    
    // Search functionality
    setupSearch() {
        this.searchData = this.generateSearchData();
    }
    
    handleSearch(e) {
        const query = e.target.value.toLowerCase();
        if (query.length < 2) return;
        
        // Simulate search with visual feedback
        const searchBox = e.target.closest('.search-box');
        if (searchBox) {
            searchBox.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.2)';
            setTimeout(() => {
                searchBox.style.boxShadow = '';
            }, 1000);
        }
    }
    
    performSearch(query) {
        if (!query || query.length < 2) return;
        
        this.showToast(`Buscando: "${query}"`, 'info');
        
        // Simulate search results
        setTimeout(() => {
            const results = Math.floor(Math.random() * 20) + 1;
            this.showToast(`${results} resultados encontrados`, 'success');
        }, 1000);
    }
    
    // Modal functions
    showVisitorRegistrationModal() {
        this.showToast('Abriendo formulario de registro...', 'info');
        // In a real app, this would open a modal
    }
    
    openDoor() {
        this.showToast('Abriendo puerta principal...', 'success');
        // Simulate door opening animation
        setTimeout(() => {
            this.showToast('Puerta abierta correctamente', 'success');
        }, 2000);
    }
    
    activateAlert() {
        this.showToast('Activando protocolo de alerta...', 'warning');
        // Simulate alert activation
        setTimeout(() => {
            this.showToast('Alerta de seguridad activada', 'error');
        }, 1500);
    }
    
    exportReport() {
        this.showToast('Generando reporte...', 'info');
        // Simulate report generation
        setTimeout(() => {
            this.showToast('Reporte exportado correctamente', 'success');
        }, 3000);
    }
    
    // Utility functions
    addRippleEffect(element, event) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
        `;
        
        element.style.position = 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    }
    
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        if (wasMobile !== this.isMobile) {
            if (!this.isMobile && this.sidebarOpen) {
                this.removeOverlay();
            }
            this.setupMobileMenu();
        }
    }
    
    incrementNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            badge.textContent = currentCount + 1;
            badge.style.animation = 'pulse 0.5s ease';
            setTimeout(() => {
                badge.style.animation = '';
            }, 500);
        }
    }
    
    // Data generation functions
    generateSearchData() {
        return [
            'Juan Pérez - Visitante',
            'María García - Empresa ABC',
            'Carlos López - Proveedor',
            'Ana Martín - Consultor',
            'Luis Rodríguez - Mantenimiento'
        ];
    }
    
    getRandomName() {
        const names = [
            'Andrea Silva', 'Roberto Méndez', 'Carmen Torres', 'Diego Vargas',
            'Lucía Herrera', 'Miguel Santos', 'Sofía Morales', 'Alejandro Ruiz'
        ];
        return names[Math.floor(Math.random() * names.length)];
    }
    
    getRandomCompany() {
        const companies = [
            'Tech Solutions', 'Innovación Digital', 'Consultoría Estratégica',
            'Servicios Profesionales', 'Grupo Empresarial', 'Desarrollo Integral'
        ];
        return companies[Math.floor(Math.random() * companies.length)];
    }
    
    getRandomAlertType() {
        const types = ['high', 'medium', 'low'];
        return types[Math.floor(Math.random() * types.length)];
    }
    
    getRandomAlertTitle() {
        const titles = [
            'Acceso no autorizado detectado',
            'Visitante sin registro',
            'Tiempo de visita extendido',
            'Dispositivo de seguridad offline',
            'Actividad sospechosa registrada'
        ];
        return titles[Math.floor(Math.random() * titles.length)];
    }
    
    getRandomAlertDescription() {
        const descriptions = [
            'Puerta lateral - Sector B',
            'Recepción principal',
            'Oficinas administrativas',
            'Estacionamiento subterráneo',
            'Área de servidores'
        ];
        return descriptions[Math.floor(Math.random() * descriptions.length)];
    }
    
    generateAvatar() {
        const colors = ['#FF6B35', '#28A745', '#17A2B8', '#FFC107', '#DC3545'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const initials = this.getRandomName().split(' ').map(n => n[0]).join('');
        return `https://via.placeholder.com/40x40/${color.replace('#', '')}/FFFFFF?text=${initials}`;
    }
    
    createVisitorElement(visitor) {
        const div = document.createElement('div');
        div.className = 'visitor-item';
        div.innerHTML = `
            <div class="visitor-avatar">
                <img src="${visitor.avatar}" alt="Visitor">
            </div>
            <div class="visitor-info">
                <div class="visitor-name">${visitor.name}</div>
                <div class="visitor-company">${visitor.company}</div>
                <div class="visitor-time">${visitor.time}</div>
            </div>
            <div class="visitor-status">
                <span class="status-badge ${visitor.status}">
                    ${visitor.status === 'active' ? 'Dentro' : 'Esperando'}
                </span>
            </div>
        `;
        return div;
    }
    
    createAlertElement(alert) {
        const div = document.createElement('div');
        div.className = `alert-item ${alert.type}`;
        
        const icons = {
            high: 'exclamation-triangle',
            medium: 'user-times',
            low: 'clock'
        };
        
        div.innerHTML = `
            <div class="alert-icon">
                <i class="fas fa-${icons[alert.type]}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-description">${alert.description}</div>
                <div class="alert-time">${alert.time}</div>
            </div>
            <div class="alert-action">
                <button class="btn-icon small">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        `;
        return div;
    }
    
    // Presentation features
    addPresentationFeatures() {
        // Add CSS animations for presentation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            .presentation-mode {
                cursor: pointer !important;
            }
            
            .demo-highlight {
                box-shadow: 0 0 20px rgba(255, 107, 53, 0.5) !important;
                transform: scale(1.02) !important;
                transition: all 0.3s ease !important;
            }
        `;
        document.head.appendChild(style);
        
        // Add presentation mode toggle
        this.setupPresentationMode();
    }
    
    setupPresentationMode() {
        // Add keyboard shortcuts for presentation
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.highlightElement('.stats-grid');
                        break;
                    case '2':
                        e.preventDefault();
                        this.highlightElement('.dashboard-card.large');
                        break;
                    case '3':
                        e.preventDefault();
                        this.highlightElement('.visitor-list');
                        break;
                    case '4':
                        e.preventDefault();
                        this.highlightElement('.alert-list');
                        break;
                }
            }
        });
    }
    
    highlightElement(selector) {
        // Remove previous highlights
        document.querySelectorAll('.demo-highlight').forEach(el => {
            el.classList.remove('demo-highlight');
        });
        
        // Add highlight to target element
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('demo-highlight');
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Remove highlight after 3 seconds
            setTimeout(() => {
                element.classList.remove('demo-highlight');
            }, 3000);
        }
    }
    
    // Cleanup
    destroy() {
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
        }
        this.removeOverlay();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fortenApp = new FortenApp();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.fortenApp) {
        window.fortenApp.destroy();
    }
});