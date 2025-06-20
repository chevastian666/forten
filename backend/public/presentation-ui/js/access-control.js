// FORTEN CRM - Access Control JavaScript
// Interactive features for access control interface

class AccessControlModule {
    constructor() {
        this.doors = new Map();
        this.realtimeUpdateInterval = null;
        this.simulationMode = true;
        
        this.init();
    }
    
    init() {
        this.setupDoorControls();
        this.setupEmergencyControls();
        this.setupFilters();
        this.initializeDoorStates();
        this.startRealtimeUpdates();
        this.setupTimelineUpdates();
        
        console.log('Access Control Module initialized');
    }
    
    // Initialize door states
    initializeDoorStates() {
        const doorCards = document.querySelectorAll('.door-card');
        
        doorCards.forEach(card => {
            const doorId = this.getDoorId(card);
            const initialState = this.getDoorState(card);
            
            this.doors.set(doorId, {
                element: card,
                state: initialState,
                lastActivity: new Date(),
                accessCount: this.getRandomAccessCount(initialState),
                lastAccess: this.getRandomLastAccess()
            });
        });
    }
    
    // Setup door control buttons
    setupDoorControls() {
        const controlButtons = document.querySelectorAll('.control-btn');
        
        controlButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDoorControl(button);
            });
        });
    }
    
    // Setup emergency controls
    setupEmergencyControls() {
        const emergencyButtons = document.querySelectorAll('.emergency-btn');
        
        emergencyButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleEmergencyControl(button);
            });
        });
    }
    
    // Setup filters
    setupFilters() {
        const filterSelects = document.querySelectorAll('.filter-select');
        const refreshButton = document.querySelector('.btn-refresh');
        
        filterSelects.forEach(select => {
            select.addEventListener('change', () => {
                this.applyFilters();
            });
        });
        
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                this.refreshAllDoors();
            });
        }
    }
    
    // Handle door control actions
    handleDoorControl(button) {
        const doorCard = button.closest('.door-card');
        const doorId = this.getDoorId(doorCard);
        const action = this.getButtonAction(button);
        
        if (button.disabled) return;
        
        // Add loading state
        this.setButtonLoading(button, true);
        
        // Simulate API call delay
        setTimeout(() => {
            this.executeDoorAction(doorId, action, button);
            this.setButtonLoading(button, false);
        }, 1500);
        
        // Show toast notification
        this.showActionToast(action, doorId);
    }
    
    // Handle emergency controls
    handleEmergencyControl(button) {
        const action = button.classList.contains('lockdown') ? 'lockdown' :
                      button.classList.contains('unlock-all') ? 'unlock-all' :
                      'emergency';
        
        // Show confirmation dialog for emergency actions
        this.showEmergencyConfirmation(action, () => {
            this.executeEmergencyAction(action);
        });
    }
    
    // Execute door action
    executeDoorAction(doorId, action, button) {
        const doorData = this.doors.get(doorId);
        if (!doorData) return;
        
        const card = doorData.element;
        const statusElement = card.querySelector('.door-status');
        const iconElement = card.querySelector('.door-icon');
        
        switch (action) {
            case 'open':
                this.updateDoorStatus(card, 'open');
                this.animateDoorIcon(iconElement, 'open');
                this.addTimelineEvent('success', 'Puerta abierta manualmente', doorId);
                break;
                
            case 'close':
                this.updateDoorStatus(card, 'locked');
                this.animateDoorIcon(iconElement, 'locked');
                this.addTimelineEvent('info', 'Puerta cerrada manualmente', doorId);
                break;
                
            case 'authorize':
                this.showAuthorizationModal(doorId);
                break;
                
            case 'monitor':
                this.openMonitorView(doorId);
                break;
                
            case 'emergency':
                this.triggerEmergencyMode(doorId);
                this.addTimelineEvent('danger', 'Protocolo de emergencia activado', doorId);
                break;
                
            case 'maintenance':
                this.setMaintenanceMode(doorId);
                this.addTimelineEvent('warning', 'Modo mantenimiento activado', doorId);
                break;
        }
        
        // Update door data
        doorData.lastActivity = new Date();
        doorData.state = this.getDoorState(card);
        
        // Update statistics
        this.updateDoorStats(card);
    }
    
    // Execute emergency actions
    executeEmergencyAction(action) {
        const allDoors = document.querySelectorAll('.door-card');
        
        switch (action) {
            case 'lockdown':
                allDoors.forEach(card => {
                    if (!card.classList.contains('emergency-exit')) {
                        this.updateDoorStatus(card, 'locked');
                        this.animateDoorIcon(card.querySelector('.door-icon'), 'locked');
                    }
                });
                this.addTimelineEvent('danger', 'BLOQUEO TOTAL ACTIVADO', 'Sistema');
                this.showEmergencyNotification('Bloqueo total activado', 'danger');
                break;
                
            case 'unlock-all':
                allDoors.forEach(card => {
                    this.updateDoorStatus(card, 'open');
                    this.animateDoorIcon(card.querySelector('.door-icon'), 'open');
                });
                this.addTimelineEvent('warning', 'DESBLOQUEO TOTAL ACTIVADO', 'Sistema');
                this.showEmergencyNotification('Todas las puertas desbloqueadas', 'warning');
                break;
                
            case 'emergency':
                this.activateEmergencyProtocol();
                this.addTimelineEvent('danger', 'PROTOCOLO DE EMERGENCIA ACTIVADO', 'Sistema');
                this.showEmergencyNotification('Protocolo de emergencia activado', 'danger');
                break;
        }
    }
    
    // Update door status
    updateDoorStatus(card, newStatus) {
        const statusElement = card.querySelector('.door-status');
        const statusText = card.querySelector('.status-text');
        
        // Remove existing status classes
        statusElement.classList.remove('open', 'locked', 'maintenance');
        
        // Add new status class
        statusElement.classList.add(newStatus);
        
        // Update status text
        const statusTexts = {
            'open': 'Abierto',
            'locked': 'Cerrado',
            'maintenance': 'Mantenimiento'
        };
        
        statusText.textContent = statusTexts[newStatus] || 'Desconocido';
        
        // Add visual feedback
        card.style.transform = 'scale(1.02)';
        setTimeout(() => {
            card.style.transform = '';
        }, 300);
    }
    
    // Animate door icon
    animateDoorIcon(iconElement, action) {
        const icon = iconElement.querySelector('i');
        
        // Remove existing classes
        iconElement.classList.remove('open', 'locked');
        
        // Add new class
        iconElement.classList.add(action);
        
        // Update icon
        if (action === 'open') {
            icon.className = 'fas fa-door-open';
        } else if (action === 'locked') {
            icon.className = 'fas fa-door-closed';
        }
        
        // Add animation effect
        icon.style.transform = 'scale(1.2)';
        setTimeout(() => {
            icon.style.transform = '';
        }, 300);
    }
    
    // Update door statistics
    updateDoorStats(card) {
        const statNumbers = card.querySelectorAll('.stat-number');
        
        statNumbers.forEach(statNumber => {
            const label = statNumber.nextElementSibling?.textContent;
            
            if (label && label.includes('Accesos')) {
                const currentValue = parseInt(statNumber.textContent) || 0;
                const newValue = currentValue + 1;
                
                // Animate number change
                this.animateNumberChange(statNumber, newValue);
            } else if (label && label.includes('Último')) {
                const now = new Date();
                const timeString = now.toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                statNumber.textContent = timeString;
                
                // Highlight change
                statNumber.style.color = 'var(--primary-orange)';
                setTimeout(() => {
                    statNumber.style.color = '';
                }, 2000);
            }
        });
    }
    
    // Add timeline event
    addTimelineEvent(type, title, location) {
        const timeline = document.querySelector('.activity-timeline');
        if (!timeline) return;
        
        const timelineItem = this.createTimelineItem(type, title, location);
        
        // Add with animation
        timelineItem.style.opacity = '0';
        timelineItem.style.transform = 'translateY(-20px)';
        timeline.insertBefore(timelineItem, timeline.firstChild);
        
        setTimeout(() => {
            timelineItem.style.transition = 'all 0.5s ease';
            timelineItem.style.opacity = '1';
            timelineItem.style.transform = 'translateY(0)';
        }, 100);
        
        // Remove old events if too many
        const events = timeline.querySelectorAll('.timeline-item');
        if (events.length > 8) {
            const lastEvent = events[events.length - 1];
            lastEvent.style.transition = 'all 0.3s ease';
            lastEvent.style.opacity = '0';
            setTimeout(() => lastEvent.remove(), 300);
        }
    }
    
    // Create timeline item
    createTimelineItem(type, title, location) {
        const div = document.createElement('div');
        div.className = `timeline-item ${type}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        div.innerHTML = `
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <div class="timeline-header">
                    <h4>${title}</h4>
                    <span class="timeline-time">${timeString}</span>
                </div>
                <div class="timeline-details">
                    <p><strong>Ubicación:</strong> ${location}</p>
                    <p><strong>Usuario:</strong> Admin Sistema</p>
                    <p><strong>Método:</strong> Control manual</p>
                </div>
            </div>
        `;
        
        return div;
    }
    
    // Show action toast
    showActionToast(action, doorId) {
        const messages = {
            'open': `Abriendo puerta: ${doorId}`,
            'close': `Cerrando puerta: ${doorId}`,
            'authorize': `Solicitando autorización para: ${doorId}`,
            'monitor': `Abriendo monitor de: ${doorId}`,
            'emergency': `Activando emergencia en: ${doorId}`,
            'maintenance': `Activando mantenimiento en: ${doorId}`
        };
        
        const message = messages[action] || `Acción ${action} en ${doorId}`;
        
        if (window.fortenApp) {
            window.fortenApp.showToast(message, 'info');
        }
    }
    
    // Show emergency confirmation
    showEmergencyConfirmation(action, callback) {
        const messages = {
            'lockdown': '¿Confirma el BLOQUEO TOTAL de todas las puertas?',
            'unlock-all': '¿Confirma DESBLOQUEAR todas las puertas?',
            'emergency': '¿Confirma activar el PROTOCOLO DE EMERGENCIA?'
        };
        
        const message = messages[action] || '¿Confirma esta acción de emergencia?';
        
        // Simple confirmation for demo
        if (confirm(message)) {
            callback();
        }
    }
    
    // Show emergency notification
    showEmergencyNotification(message, type) {
        if (window.fortenApp) {
            window.fortenApp.showToast(message, type);
        }
        
        // Add visual feedback to emergency controls
        const emergencyControls = document.querySelector('.emergency-controls');
        if (emergencyControls) {
            emergencyControls.style.animation = 'pulse 1s ease';
            setTimeout(() => {
                emergencyControls.style.animation = '';
            }, 1000);
        }
    }
    
    // Set button loading state
    setButtonLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.style.opacity = '0.7';
            
            const originalText = button.innerHTML;
            button.dataset.originalText = originalText;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        } else {
            button.disabled = false;
            button.style.opacity = '';
            
            if (button.dataset.originalText) {
                button.innerHTML = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        }
    }
    
    // Apply filters
    applyFilters() {
        const zoneFilter = document.querySelector('.filter-select').value;
        const statusFilter = document.querySelectorAll('.filter-select')[1]?.value;
        
        const doorCards = document.querySelectorAll('.door-card');
        
        doorCards.forEach(card => {
            let show = true;
            
            // Zone filter
            if (zoneFilter !== 'all') {
                const zoneText = card.querySelector('.door-zone').textContent.toLowerCase();
                show = show && zoneText.includes(zoneFilter);
            }
            
            // Status filter
            if (statusFilter !== 'all' && statusFilter) {
                const statusElement = card.querySelector('.door-status');
                show = show && statusElement.classList.contains(statusFilter.replace('locked', 'locked'));
            }
            
            // Apply filter
            if (show) {
                card.style.display = '';
                card.style.animation = 'fadeInUp 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });
        
        if (window.fortenApp) {
            window.fortenApp.showToast('Filtros aplicados', 'info');
        }
    }
    
    // Refresh all doors
    refreshAllDoors() {
        const refreshButton = document.querySelector('.btn-refresh');
        const icon = refreshButton.querySelector('i');
        
        // Animate refresh icon
        icon.style.animation = 'spin 1s linear infinite';
        
        // Simulate refresh
        setTimeout(() => {
            icon.style.animation = '';
            
            // Update some random door stats
            this.simulateRandomActivity();
            
            if (window.fortenApp) {
                window.fortenApp.showToast('Estado actualizado', 'success');
            }
        }, 1500);
    }
    
    // Start realtime updates
    startRealtimeUpdates() {
        this.realtimeUpdateInterval = setInterval(() => {
            if (this.simulationMode) {
                this.simulateRandomActivity();
            }
        }, 30000); // Update every 30 seconds
    }
    
    // Simulate random activity
    simulateRandomActivity() {
        const doorCards = document.querySelectorAll('.door-card');
        const randomCard = doorCards[Math.floor(Math.random() * doorCards.length)];
        
        if (Math.random() > 0.7) { // 30% chance
            this.updateDoorStats(randomCard);
            
            // Add activity indicator
            const activityIndicator = randomCard.querySelector('.activity-indicator');
            if (activityIndicator) {
                activityIndicator.classList.add('active');
                setTimeout(() => {
                    activityIndicator.classList.remove('active');
                }, 5000);
            }
        }
    }
    
    // Utility functions
    getDoorId(card) {
        const title = card.querySelector('.door-title h3')?.textContent || 'Unknown';
        return title.replace(/\s+/g, '_').toLowerCase();
    }
    
    getDoorState(card) {
        const statusElement = card.querySelector('.door-status');
        if (statusElement.classList.contains('open')) return 'open';
        if (statusElement.classList.contains('locked')) return 'locked';
        if (statusElement.classList.contains('maintenance')) return 'maintenance';
        return 'unknown';
    }
    
    getButtonAction(button) {
        const text = button.textContent.toLowerCase();
        
        if (text.includes('abrir') || text.includes('subir')) return 'open';
        if (text.includes('cerrar') || text.includes('bajar')) return 'close';
        if (text.includes('autorizar')) return 'authorize';
        if (text.includes('monitor') || text.includes('cámaras')) return 'monitor';
        if (text.includes('emergencia')) return 'emergency';
        if (text.includes('mantenimiento')) return 'maintenance';
        
        return 'unknown';
    }
    
    getRandomAccessCount(state) {
        const baseCount = state === 'open' ? 50 : 10;
        return Math.floor(Math.random() * baseCount) + baseCount;
    }
    
    getRandomLastAccess() {
        const now = new Date();
        const randomMinutes = Math.floor(Math.random() * 120); // Last 2 hours
        return new Date(now.getTime() - randomMinutes * 60000);
    }
    
    animateNumberChange(element, newValue) {
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
    
    // Advanced features (for presentation)
    showAuthorizationModal(doorId) {
        if (window.fortenApp) {
            window.fortenApp.showToast(`Abriendo panel de autorización para: ${doorId}`, 'info');
        }
    }
    
    openMonitorView(doorId) {
        if (window.fortenApp) {
            window.fortenApp.showToast(`Abriendo vista de monitoreo para: ${doorId}`, 'info');
        }
    }
    
    triggerEmergencyMode(doorId) {
        const card = this.doors.get(doorId)?.element;
        if (card) {
            card.style.borderLeftColor = 'var(--danger)';
            card.style.boxShadow = '0 0 20px rgba(220, 53, 69, 0.3)';
            
            setTimeout(() => {
                card.style.borderLeftColor = '';
                card.style.boxShadow = '';
            }, 5000);
        }
    }
    
    setMaintenanceMode(doorId) {
        const card = this.doors.get(doorId)?.element;
        if (card) {
            this.updateDoorStatus(card, 'maintenance');
            
            // Disable all controls except maintenance
            const controls = card.querySelectorAll('.control-btn');
            controls.forEach(btn => {
                if (!btn.textContent.toLowerCase().includes('mantenimiento')) {
                    btn.disabled = true;
                    btn.classList.add('disabled');
                }
            });
        }
    }
    
    activateEmergencyProtocol() {
        // Visual effects for emergency mode
        document.body.style.background = 'linear-gradient(45deg, #DC3545, #C82333)';
        document.body.style.animation = 'emergency-pulse 2s infinite';
        
        setTimeout(() => {
            document.body.style.background = '';
            document.body.style.animation = '';
        }, 10000);
    }
    
    setupTimelineUpdates() {
        // Add CSS for emergency pulse
        const style = document.createElement('style');
        style.textContent = `
            @keyframes emergency-pulse {
                0% { filter: brightness(1); }
                50% { filter: brightness(1.1); }
                100% { filter: brightness(1); }
            }
            
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Cleanup
    destroy() {
        if (this.realtimeUpdateInterval) {
            clearInterval(this.realtimeUpdateInterval);
        }
    }
}

// Initialize access control module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.accessControl = new AccessControlModule();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.accessControl) {
        window.accessControl.destroy();
    }
});