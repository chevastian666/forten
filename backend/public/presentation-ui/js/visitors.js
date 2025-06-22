// FORTEN CRM - Visitors Management JavaScript
// Interactive features for visitor management interface

class VisitorsModule {
    constructor() {
        this.visitors = new Map();
        this.currentFilters = {
            status: 'all',
            date: 'today'
        };
        this.realtimeUpdateInterval = null;
        this.simulationMode = true;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupFilters();
        this.setupQuickRegistration();
        this.initializeVisitorData();
        this.setupCurrentDate();
        this.startRealtimeUpdates();
        this.setupTableInteractions();
        
        console.log('Visitors Management Module initialized');
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Registration buttons
        const registerBtn = document.querySelector('.visitor-register-btn');
        const checkinBtn = document.querySelector('.visitor-checkin-btn');
        
        if (registerBtn) {
            registerBtn.addEventListener('click', () => this.openRegistrationModal());
        }
        
        if (checkinBtn) {
            checkinBtn.addEventListener('click', () => this.openQuickCheckin());
        }
        
        // Export button
        const exportBtn = document.querySelector('.export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportVisitorData());
        }
        
        // Action buttons in table
        const actionButtons = document.querySelectorAll('.action-buttons .btn-icon');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleVisitorAction(e));
        });
        
        // Schedule actions
        const scheduleButtons = document.querySelectorAll('.schedule-actions .btn-small');
        scheduleButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleScheduleAction(e));
        });
    }
    
    // Setup filters
    setupFilters() {
        const statusFilter = document.querySelector('.status-filter');
        const dateFilter = document.querySelector('.date-filter');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.applyFilters();
            });
        }
        
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.currentFilters.date = e.target.value;
                this.applyFilters();
            });
        }
    }
    
    // Setup quick registration form
    setupQuickRegistration() {
        const quickForm = document.querySelector('.quick-form');
        if (quickForm) {
            quickForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.processQuickRegistration(quickForm);
            });
        }
    }
    
    // Initialize visitor data
    initializeVisitorData() {
        const visitorRows = document.querySelectorAll('.visitor-row');
        
        visitorRows.forEach((row, index) => {
            const visitorData = this.extractVisitorData(row);
            this.visitors.set(visitorData.id, {
                ...visitorData,
                element: row,
                lastUpdate: new Date()
            });
        });
    }
    
    // Setup current date
    setupCurrentDate() {
        const dateElement = document.getElementById('current-date');
        if (dateElement) {
            const today = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            };
            dateElement.textContent = today.toLocaleDateString('es-ES', options);
        }
    }
    
    // Setup table interactions
    setupTableInteractions() {
        const tableRows = document.querySelectorAll('.visitor-row');
        
        tableRows.forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.action-buttons')) {
                    this.selectVisitorRow(row);
                }
            });
        });
    }
    
    // Handle visitor actions
    handleVisitorAction(e) {
        e.stopPropagation();
        
        const button = e.target.closest('.btn-icon');
        const row = button.closest('.visitor-row');
        const visitorData = this.extractVisitorData(row);
        const action = this.getActionFromButton(button);
        
        // Add loading state
        this.setButtonLoading(button, true);
        
        // Simulate API call
        setTimeout(() => {
            this.executeVisitorAction(action, visitorData, row, button);
            this.setButtonLoading(button, false);
        }, 1000);
        
        // Show toast notification
        this.showActionToast(action, visitorData.name);
    }
    
    // Handle schedule actions
    handleScheduleAction(e) {
        e.stopPropagation();
        
        const button = e.target.closest('.btn-small');
        const scheduleItem = button.closest('.schedule-item');
        const visitorName = scheduleItem.querySelector('.visitor-schedule-name')?.textContent;
        const action = button.textContent.trim();
        
        // Add loading effect
        button.style.opacity = '0.7';
        
        setTimeout(() => {
            button.style.opacity = '';
            this.executeScheduleAction(action, visitorName, scheduleItem);
        }, 800);
        
        this.showActionToast(action, visitorName);
    }
    
    // Execute visitor action
    executeVisitorAction(action, visitorData, row, button) {
        switch (action) {
            case 'view':
                this.viewVisitorDetails(visitorData);
                break;
            case 'checkout':
                this.checkoutVisitor(visitorData, row);
                break;
            case 'message':
                this.sendMessageToVisitor(visitorData);
                break;
            case 'approve':
                this.approveVisitor(visitorData, row);
                break;
            case 'reject':
                this.rejectVisitor(visitorData, row);
                break;
            case 'contact':
                this.contactVisitor(visitorData);
                break;
            case 'history':
                this.viewVisitorHistory(visitorData);
                break;
            case 'report':
                this.generateVisitorReport(visitorData);
                break;
            case 'invite':
                this.resendInvitation(visitorData);
                break;
        }
    }
    
    // Execute schedule action
    executeScheduleAction(action, visitorName, scheduleItem) {
        switch (action.toLowerCase()) {
            case 'pre-aprobar':
                this.preApproveVisitor(visitorName, scheduleItem);
                break;
            case 'contactar':
                this.contactScheduledVisitor(visitorName);
                break;
            case 'acceso especial':
                this.grantSpecialAccess(visitorName, scheduleItem);
                break;
        }
    }
    
    // Visitor action implementations
    viewVisitorDetails(visitorData) {
        if (window.fortenApp) {
            window.fortenApp.showToast(`Abriendo detalles de ${visitorData.name}`, 'info');
        }
    }
    
    checkoutVisitor(visitorData, row) {
        this.updateVisitorStatus(row, 'exited');
        this.updateStatistics('checkout');
        this.addVisitorToHistory(visitorData, 'checked_out');
    }
    
    approveVisitor(visitorData, row) {
        this.updateVisitorStatus(row, 'inside');
        this.updateStatistics('approve');
        this.addVisitorToHistory(visitorData, 'approved');
    }
    
    rejectVisitor(visitorData, row) {
        this.updateVisitorStatus(row, 'expired');
        this.updateStatistics('reject');
        this.addVisitorToHistory(visitorData, 'rejected');
    }
    
    preApproveVisitor(visitorName, scheduleItem) {
        scheduleItem.classList.add('pre-approved');
        const button = scheduleItem.querySelector('.btn-small');
        button.textContent = 'Pre-aprobado';
        button.style.background = 'var(--success)';
        button.style.color = 'white';
    }
    
    grantSpecialAccess(visitorName, scheduleItem) {
        scheduleItem.classList.add('special-access');
        const button = scheduleItem.querySelector('.btn-small');
        button.textContent = 'Acceso otorgado';
        button.style.background = 'var(--primary-orange)';
        button.style.color = 'white';
    }
    
    // Update visitor status
    updateVisitorStatus(row, newStatus) {
        const statusBadge = row.querySelector('.status-badge');
        
        // Remove existing status classes
        statusBadge.classList.remove('inside', 'pending', 'exited', 'expired');
        
        // Add new status
        statusBadge.classList.add(newStatus);
        
        // Update text
        const statusTexts = {
            'inside': 'Dentro',
            'pending': 'Esperando',
            'exited': 'Salió',
            'expired': 'Expirado'
        };
        
        statusBadge.textContent = statusTexts[newStatus] || newStatus;
        
        // Add animation
        statusBadge.classList.add('changing');
        setTimeout(() => {
            statusBadge.classList.remove('changing');
        }, 300);
    }
    
    // Update statistics
    updateStatistics(action) {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(statElement => {
            const card = statElement.closest('.stat-card');
            
            if (action === 'checkout' && card.classList.contains('visitors-inside')) {
                this.decrementStat(statElement);
            } else if (action === 'approve' && card.classList.contains('visitors-inside')) {
                this.incrementStat(statElement);
            } else if (action === 'approve' && card.classList.contains('pending-approval')) {
                this.decrementStat(statElement);
            }
        });
    }
    
    // Process quick registration
    processQuickRegistration(form) {
        const formData = new FormData(form);
        const visitorData = {
            name: form.querySelector('input[placeholder*="Juan"]').value,
            company: form.querySelector('input[placeholder*="Tech"]').value,
            host: form.querySelector('.form-select').value,
            purpose: form.querySelectorAll('.form-select')[1].value
        };
        
        if (!visitorData.name || !visitorData.company) {
            if (window.fortenApp) {
                window.fortenApp.showToast('Por favor complete los campos requeridos', 'warning');
            }
            return;
        }
        
        // Add loading state to form
        const submitButton = form.querySelector('button[type="submit"]');
        this.setButtonLoading(submitButton, true);
        
        // Simulate registration process
        setTimeout(() => {
            this.addNewVisitorToTable(visitorData);
            this.setButtonLoading(submitButton, false);
            form.reset();
            
            if (window.fortenApp) {
                window.fortenApp.showToast(`Visitante ${visitorData.name} registrado exitosamente`, 'success');
            }
        }, 2000);
    }
    
    // Add new visitor to table
    addNewVisitorToTable(visitorData) {
        const tbody = document.querySelector('.visitors-table tbody');
        const newRow = this.createVisitorRow(visitorData);
        
        // Add with animation
        newRow.classList.add('new');
        tbody.insertBefore(newRow, tbody.firstChild);
        
        // Setup event listeners for new row
        this.setupRowEventListeners(newRow);
        
        // Update statistics
        this.incrementStat(document.querySelector('.visitors-today .stat-number'));
        this.incrementStat(document.querySelector('.pending-approval .stat-number'));
    }
    
    // Create visitor row element
    createVisitorRow(visitorData) {
        const row = document.createElement('tr');
        row.className = 'visitor-row';
        
        const visitorId = Math.floor(Math.random() * 9000) + 1000;
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        row.innerHTML = `
            <td>
                <div class="visitor-info">
                    <img src="https://via.placeholder.com/40x40/FF6B35/FFFFFF?text=${this.getInitials(visitorData.name)}" alt="Visitor" class="visitor-photo">
                    <div class="visitor-details">
                        <div class="visitor-name">${visitorData.name}</div>
                        <div class="visitor-id">ID: ${visitorId}</div>
                    </div>
                </div>
            </td>
            <td>
                <div class="company-info">
                    <div class="company-name">${visitorData.company}</div>
                    <div class="company-type">Visitante</div>
                </div>
            </td>
            <td>
                <div class="host-info">
                    <div class="host-name">${visitorData.host}</div>
                    <div class="host-dept">-</div>
                </div>
            </td>
            <td>
                <div class="time-info">
                    <div class="entry-time">${timeString}</div>
                    <div class="entry-date">Hoy</div>
                </div>
            </td>
            <td>
                <span class="status-badge pending">Esperando</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon small approve" title="Aprobar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon small reject" title="Rechazar">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="btn-icon small" title="Contactar">
                        <i class="fas fa-phone"></i>
                    </button>
                </div>
            </td>
        `;
        
        return row;
    }
    
    // Apply filters
    applyFilters() {
        const rows = document.querySelectorAll('.visitor-row');
        
        rows.forEach(row => {
            let show = true;
            
            // Status filter
            if (this.currentFilters.status !== 'all') {
                const statusBadge = row.querySelector('.status-badge');
                show = show && statusBadge.classList.contains(this.currentFilters.status);
            }
            
            // Date filter would be implemented here
            // For demo purposes, we'll show all
            
            if (show) {
                row.style.display = '';
                row.style.animation = 'fadeInUp 0.3s ease';
            } else {
                row.style.display = 'none';
            }
        });
        
        if (window.fortenApp) {
            window.fortenApp.showToast('Filtros aplicados', 'info');
        }
    }
    
    // Start realtime updates
    startRealtimeUpdates() {
        this.realtimeUpdateInterval = setInterval(() => {
            if (this.simulationMode) {
                this.simulateVisitorActivity();
                this.updateScheduleStatus();
            }
        }, 30000); // Update every 30 seconds
    }
    
    // Simulate visitor activity
    simulateVisitorActivity() {
        if (Math.random() > 0.8) { // 20% chance
            this.simulateRandomVisitorAction();
        }
        
        if (Math.random() > 0.9) { // 10% chance
            this.simulateNewVisitor();
        }
    }
    
    // Simulate random visitor action
    simulateRandomVisitorAction() {
        const rows = document.querySelectorAll('.visitor-row');
        if (rows.length === 0) return;
        
        const randomRow = rows[Math.floor(Math.random() * rows.length)];
        const statusBadge = randomRow.querySelector('.status-badge');
        
        // Random status changes
        if (statusBadge.classList.contains('pending') && Math.random() > 0.5) {
            this.updateVisitorStatus(randomRow, 'inside');
        } else if (statusBadge.classList.contains('inside') && Math.random() > 0.8) {
            this.updateVisitorStatus(randomRow, 'exited');
        }
    }
    
    // Simulate new visitor
    simulateNewVisitor() {
        const names = ['Pedro González', 'Isabel Morales', 'Diego Vargas', 'Carmen Ruiz'];
        const companies = ['Innovación Tech', 'Servicios Pro', 'Consultoría Plus', 'Digital Solutions'];
        const hosts = ['Carlos López - IT', 'María García - Ventas', 'Roberto Silva - Finanzas'];
        
        const newVisitor = {
            name: names[Math.floor(Math.random() * names.length)],
            company: companies[Math.floor(Math.random() * companies.length)],
            host: hosts[Math.floor(Math.random() * hosts.length)],
            purpose: 'Reunión de trabajo'
        };
        
        this.addNewVisitorToTable(newVisitor);
    }
    
    // Update schedule status
    updateScheduleStatus() {
        const scheduleItems = document.querySelectorAll('.schedule-item');
        
        scheduleItems.forEach(item => {
            if (Math.random() > 0.9) { // 10% chance
                const button = item.querySelector('.btn-small');
                if (button && !item.classList.contains('pre-approved')) {
                    button.style.animation = 'pulse 1s ease';
                    setTimeout(() => {
                        button.style.animation = '';
                    }, 1000);
                }
            }
        });
    }
    
    // Utility functions
    extractVisitorData(row) {
        return {
            id: row.querySelector('.visitor-id')?.textContent || '',
            name: row.querySelector('.visitor-name')?.textContent || '',
            company: row.querySelector('.company-name')?.textContent || '',
            host: row.querySelector('.host-name')?.textContent || '',
            status: this.getVisitorStatus(row)
        };
    }
    
    getVisitorStatus(row) {
        const statusBadge = row.querySelector('.status-badge');
        if (statusBadge.classList.contains('inside')) return 'inside';
        if (statusBadge.classList.contains('pending')) return 'pending';
        if (statusBadge.classList.contains('exited')) return 'exited';
        if (statusBadge.classList.contains('expired')) return 'expired';
        return 'unknown';
    }
    
    getActionFromButton(button) {
        const icon = button.querySelector('i');
        if (!icon) return 'unknown';
        
        const iconClass = icon.className;
        
        if (iconClass.includes('fa-eye')) return 'view';
        if (iconClass.includes('fa-sign-out-alt')) return 'checkout';
        if (iconClass.includes('fa-comment')) return 'message';
        if (iconClass.includes('fa-check')) return 'approve';
        if (iconClass.includes('fa-times')) return 'reject';
        if (iconClass.includes('fa-phone')) return 'contact';
        if (iconClass.includes('fa-history')) return 'history';
        if (iconClass.includes('fa-file-pdf')) return 'report';
        if (iconClass.includes('fa-envelope')) return 'invite';
        
        return 'unknown';
    }
    
    getInitials(name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    
    incrementStat(element) {
        const currentValue = parseInt(element.textContent) || 0;
        this.animateStatChange(element, currentValue + 1);
    }
    
    decrementStat(element) {
        const currentValue = parseInt(element.textContent) || 0;
        this.animateStatChange(element, Math.max(0, currentValue - 1));
    }
    
    animateStatChange(element, newValue) {
        element.style.color = 'var(--primary-orange)';
        element.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            element.textContent = newValue;
            setTimeout(() => {
                element.style.color = '';
                element.style.transform = '';
            }, 200);
        }, 150);
    }
    
    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.style.opacity = '0.7';
            
            const originalContent = button.innerHTML;
            button.dataset.originalContent = originalContent;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else {
            button.disabled = false;
            button.style.opacity = '';
            
            if (button.dataset.originalContent) {
                button.innerHTML = button.dataset.originalContent;
                delete button.dataset.originalContent;
            }
        }
    }
    
    setupRowEventListeners(row) {
        const actionButtons = row.querySelectorAll('.action-buttons .btn-icon');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleVisitorAction(e));
        });
        
        row.addEventListener('click', (e) => {
            if (!e.target.closest('.action-buttons')) {
                this.selectVisitorRow(row);
            }
        });
    }
    
    selectVisitorRow(row) {
        // Remove selection from other rows
        document.querySelectorAll('.visitor-row.selected').forEach(r => {
            r.classList.remove('selected');
        });
        
        // Add selection to current row
        row.classList.add('selected');
        
        // Add selected row styling
        const style = document.createElement('style');
        style.textContent = `
            .visitor-row.selected {
                background: rgba(255, 107, 53, 0.1) !important;
                border-left: 4px solid var(--primary-orange);
            }
        `;
        
        if (!document.querySelector('#visitor-selection-style')) {
            style.id = 'visitor-selection-style';
            document.head.appendChild(style);
        }
    }
    
    showActionToast(action, visitorName) {
        const messages = {
            'view': `Viendo detalles de ${visitorName}`,
            'checkout': `${visitorName} ha salido del edificio`,
            'approve': `${visitorName} ha sido aprobado`,
            'reject': `Visita de ${visitorName} rechazada`,
            'Pre-aprobar': `${visitorName} pre-aprobado para el acceso`,
            'Contactar': `Contactando a ${visitorName}`,
            'Acceso especial': `Acceso especial otorgado a ${visitorName}`
        };
        
        const message = messages[action] || `Acción ${action} ejecutada para ${visitorName}`;
        
        if (window.fortenApp) {
            window.fortenApp.showToast(message, 'info');
        }
    }
    
    // Advanced features
    openRegistrationModal() {
        if (window.fortenApp) {
            window.fortenApp.showToast('Abriendo formulario de registro completo...', 'info');
        }
    }
    
    openQuickCheckin() {
        if (window.fortenApp) {
            window.fortenApp.showToast('Abriendo check-in rápido...', 'info');
        }
    }
    
    exportVisitorData() {
        if (window.fortenApp) {
            window.fortenApp.showToast('Exportando datos de visitantes...', 'info');
        }
        
        // Simulate export process
        setTimeout(() => {
            if (window.fortenApp) {
                window.fortenApp.showToast('Datos exportados correctamente', 'success');
            }
        }, 2000);
    }
    
    addVisitorToHistory(visitorData, action) {
        // In a real app, this would log to a history system
        console.log(`Visitor ${visitorData.name} - Action: ${action} at ${new Date().toISOString()}`);
    }
    
    // Cleanup
    destroy() {
        if (this.realtimeUpdateInterval) {
            clearInterval(this.realtimeUpdateInterval);
        }
    }
}

// Initialize visitors module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.visitorsModule = new VisitorsModule();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.visitorsModule) {
        window.visitorsModule.destroy();
    }
});