// FORTEN CRM - Security Center JavaScript
// Interactive features for security monitoring interface

class SecurityModule {
    constructor() {
        this.emergencyState = 'normal';
        this.cameras = new Map();
        this.alerts = new Map();
        this.incidents = new Map();
        this.systemComponents = new Map();
        this.realtimeUpdateInterval = null;
        this.simulationMode = true;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initializeCameras();
        this.initializeAlerts();
        this.initializeIncidents();
        this.initializeSystemComponents();
        this.startRealtimeUpdates();
        this.setupEmergencyControls();
        
        console.log('Security Center Module initialized');
    }
    
    // Setup event listeners
    setupEventListeners() {
        // Emergency buttons
        const emergencyButtons = document.querySelectorAll('.emergency-btn');
        emergencyButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleEmergencyAction(e));
        });
        
        // Camera controls
        const cameraButtons = document.querySelectorAll('.camera-btn');
        cameraButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleCameraAction(e));
        });
        
        // Alert actions
        const alertButtons = document.querySelectorAll('.alert-actions .btn-small');
        alertButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleAlertAction(e));
        });
        
        // Camera feed interactions
        const cameraFeeds = document.querySelectorAll('.camera-feed');
        cameraFeeds.forEach(feed => {
            feed.addEventListener('click', () => this.selectCamera(feed));
            feed.addEventListener('dblclick', () => this.expandCamera(feed));
        });
        
        // View controls
        const viewAllBtn = document.querySelector('.view-all');
        const gridToggleBtn = document.querySelector('.grid-toggle');
        
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => this.toggleViewAll());
        }
        
        if (gridToggleBtn) {
            gridToggleBtn.addEventListener('click', () => this.toggleGridLayout());
        }
    }
    
    // Initialize cameras
    initializeCameras() {
        const cameraFeeds = document.querySelectorAll('.camera-feed');
        
        cameraFeeds.forEach(feed => {
            const cameraId = feed.dataset.camera;
            const cameraName = feed.querySelector('.camera-name').textContent;
            const status = feed.querySelector('.camera-status').classList.contains('online') ? 'online' : 'offline';
            
            this.cameras.set(cameraId, {
                id: cameraId,
                name: cameraName,
                status: status,
                element: feed,
                recording: status === 'online',
                lastUpdate: new Date()
            });
        });
    }
    
    // Initialize alerts
    initializeAlerts() {
        const alertItems = document.querySelectorAll('.alert-item');
        
        alertItems.forEach((item, index) => {
            const alertData = this.extractAlertData(item);
            this.alerts.set(`alert-${index}`, {
                ...alertData,
                element: item,
                timestamp: new Date()
            });
        });
    }
    
    // Initialize incidents
    initializeIncidents() {
        const incidentItems = document.querySelectorAll('.incident-item');
        
        incidentItems.forEach((item, index) => {
            const incidentData = this.extractIncidentData(item);
            this.incidents.set(`incident-${index}`, {
                ...incidentData,
                element: item,
                timestamp: new Date()
            });
        });
    }
    
    // Initialize system components
    initializeSystemComponents() {
        const componentCards = document.querySelectorAll('.component-card');
        
        componentCards.forEach((card, index) => {
            const componentData = this.extractComponentData(card);
            this.systemComponents.set(`component-${index}`, {
                ...componentData,
                element: card,
                lastUpdate: new Date()
            });
        });
    }
    
    // Setup emergency controls
    setupEmergencyControls() {
        this.updateEmergencyStatus('normal');
    }
    
    // Handle emergency actions
    handleEmergencyAction(e) {
        const button = e.target.closest('.emergency-btn');
        const action = button.dataset.action;
        
        // Add loading state
        this.setButtonLoading(button, true);
        
        // Show confirmation for critical actions
        if (action === 'lockdown' || action === 'evacuation') {
            if (!this.confirmEmergencyAction(action)) {
                this.setButtonLoading(button, false);
                return;
            }
        }
        
        // Simulate processing time
        setTimeout(() => {
            this.executeEmergencyAction(action, button);
            this.setButtonLoading(button, false);
        }, 2000);
        
        this.showActionToast(action);
    }
    
    // Execute emergency action
    executeEmergencyAction(action, button) {
        switch (action) {
            case 'lockdown':
                this.activateLockdown();
                break;
            case 'evacuation':
                this.activateEvacuation();
                break;
            case 'security':
                this.alertSecurity();
                break;
            case 'reset':
                this.resetSystem();
                break;
        }
    }
    
    // Emergency action implementations
    activateLockdown() {
        this.emergencyState = 'lockdown';
        this.updateEmergencyStatus('alert');
        this.lockAllDoors();
        this.addNewAlert('critical', 'Bloqueo Total Activado', 'Todas las puertas han sido bloqueadas');
        this.updateStatistics('lockdown');
    }
    
    activateEvacuation() {
        this.emergencyState = 'evacuation';
        this.updateEmergencyStatus('alert');
        this.openAllDoors();
        this.addNewAlert('warning', 'Evacuación Activada', 'Todas las salidas de emergencia abiertas');
        this.updateStatistics('evacuation');
    }
    
    alertSecurity() {
        this.addNewAlert('info', 'Seguridad Contactada', 'Personal de seguridad notificado');
        this.simulateSecurityResponse();
    }
    
    resetSystem() {
        this.emergencyState = 'normal';
        this.updateEmergencyStatus('normal');
        this.addNewAlert('info', 'Sistema Restablecido', 'Todos los sistemas vuelven a estado normal');
        this.updateStatistics('reset');
    }
    
    // Update emergency status
    updateEmergencyStatus(status) {
        const statusIndicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.emergency-status span:last-child');
        
        statusIndicator.className = `status-indicator ${status}`;
        
        const statusTexts = {
            'normal': 'Estado Normal',
            'alert': 'Estado de Alerta',
            'emergency': 'Emergencia Activa'
        };
        
        statusText.textContent = statusTexts[status] || status;
    }
    
    // Handle camera actions
    handleCameraAction(e) {
        e.stopPropagation();
        
        const button = e.target.closest('.camera-btn');
        const cameraFeed = button.closest('.camera-feed');
        const cameraId = cameraFeed.dataset.camera;
        const action = this.getCameraAction(button);
        
        // Add loading state
        this.setButtonLoading(button, true);
        
        setTimeout(() => {
            this.executeCameraAction(action, cameraId, cameraFeed);
            this.setButtonLoading(button, false);
        }, 1000);
        
        this.showCameraActionToast(action, cameraId);
    }
    
    // Execute camera action
    executeCameraAction(action, cameraId, cameraFeed) {
        const camera = this.cameras.get(cameraId);
        
        switch (action) {
            case 'zoom':
                this.zoomCamera(camera, cameraFeed);
                break;
            case 'capture':
                this.captureCamera(camera);
                break;
            case 'ptz':
                this.controlPTZ(camera);
                break;
            case 'reconnect':
                this.reconnectCamera(camera, cameraFeed);
                break;
        }
    }
    
    // Camera action implementations
    zoomCamera(camera, cameraFeed) {
        cameraFeed.classList.add('zoomed');
        setTimeout(() => {
            cameraFeed.classList.remove('zoomed');
        }, 3000);
    }
    
    captureCamera(camera) {
        // Simulate capture
        if (window.fortenApp) {
            window.fortenApp.showToast(`Captura guardada - ${camera.name}`, 'success');
        }
    }
    
    controlPTZ(camera) {
        // Simulate PTZ control
        if (window.fortenApp) {
            window.fortenApp.showToast(`Control PTZ activado - ${camera.name}`, 'info');
        }
    }
    
    reconnectCamera(camera, cameraFeed) {
        // Simulate reconnection
        const statusElement = cameraFeed.querySelector('.camera-status');
        const viewportElement = cameraFeed.querySelector('.camera-viewport');
        
        statusElement.className = 'camera-status online';
        statusElement.innerHTML = '<i class="fas fa-circle"></i>EN LÍNEA';
        
        viewportElement.classList.remove('offline');
        viewportElement.innerHTML = `
            <div class="camera-placeholder">
                <i class="fas fa-video"></i>
                <div class="recording-indicator">
                    <i class="fas fa-record-vinyl"></i>
                    REC
                </div>
            </div>
        `;
        
        camera.status = 'online';
        this.updateCameraStats();
    }
    
    // Handle alert actions
    handleAlertAction(e) {
        e.stopPropagation();
        
        const button = e.target.closest('.btn-small');
        const alertItem = button.closest('.alert-item');
        const action = button.textContent.trim();
        
        // Add loading state
        this.setButtonLoading(button, true);
        
        setTimeout(() => {
            this.executeAlertAction(action, alertItem);
            this.setButtonLoading(button, false);
        }, 1500);
    }
    
    // Execute alert action
    executeAlertAction(action, alertItem) {
        switch (action.toLowerCase()) {
            case 'verificar':
            case 'revisar':
                this.markAlertAsReviewed(alertItem);
                break;
            case 'descartar':
            case 'ignorar':
            case 'ok':
                this.dismissAlert(alertItem);
                break;
            case 'reconectar':
                this.handleReconnectAction(alertItem);
                break;
        }
    }
    
    // Mark alert as reviewed
    markAlertAsReviewed(alertItem) {
        alertItem.style.opacity = '0.7';
        alertItem.classList.add('reviewed');
        
        const actionsDiv = alertItem.querySelector('.alert-actions');
        actionsDiv.innerHTML = '<span class="reviewed-label">Revisado</span>';
        
        this.updateAlertCount(-1);
    }
    
    // Dismiss alert
    dismissAlert(alertItem) {
        alertItem.style.animation = 'fadeOut 0.3s ease forwards';
        
        setTimeout(() => {
            alertItem.remove();
            this.updateAlertCount(-1);
        }, 300);
    }
    
    // Handle reconnect action
    handleReconnectAction(alertItem) {
        // Find the related camera and reconnect it
        const cameraFeed = document.querySelector('[data-camera="parking"]');
        if (cameraFeed) {
            const camera = this.cameras.get('parking');
            this.reconnectCamera(camera, cameraFeed);
        }
        
        this.dismissAlert(alertItem);
    }
    
    // Select camera
    selectCamera(cameraFeed) {
        // Remove selection from other cameras
        document.querySelectorAll('.camera-feed.selected').forEach(feed => {
            feed.classList.remove('selected');
        });
        
        // Add selection to current camera
        cameraFeed.classList.add('selected');
        
        // Add selection styling
        if (!document.querySelector('#camera-selection-style')) {
            const style = document.createElement('style');
            style.id = 'camera-selection-style';
            style.textContent = `
                .camera-feed.selected {
                    border-color: var(--primary-orange) !important;
                    box-shadow: var(--shadow-orange) !important;
                    transform: scale(1.02);
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Expand camera
    expandCamera(cameraFeed) {
        const cameraName = cameraFeed.querySelector('.camera-name').textContent;
        
        if (window.fortenApp) {
            window.fortenApp.showToast(`Expandiendo vista - ${cameraName}`, 'info');
        }
        
        // Simulate fullscreen mode
        cameraFeed.classList.add('expanded');
        setTimeout(() => {
            cameraFeed.classList.remove('expanded');
        }, 3000);
    }
    
    // Start realtime updates
    startRealtimeUpdates() {
        this.realtimeUpdateInterval = setInterval(() => {
            if (this.simulationMode) {
                this.simulateSecurityActivity();
                this.updateSystemMetrics();
            }
        }, 15000); // Update every 15 seconds
    }
    
    // Simulate security activity
    simulateSecurityActivity() {
        if (Math.random() > 0.8) { // 20% chance
            this.simulateRandomAlert();
        }
        
        if (Math.random() > 0.9) { // 10% chance
            this.simulateIncident();
        }
        
        if (Math.random() > 0.95) { // 5% chance
            this.simulateCameraIssue();
        }
    }
    
    // Simulate random alert
    simulateRandomAlert() {
        const alertTypes = [
            { type: 'info', title: 'Puerta Abierta', desc: 'Puerta mantenida abierta por tiempo prolongado' },
            { type: 'warning', title: 'Sensor Activado', desc: 'Detector de movimiento en área restringida' },
            { type: 'info', title: 'Check-in Tardío', desc: 'Visitante no se presentó a la hora programada' }
        ];
        
        const randomAlert = alertTypes[Math.floor(Math.random() * alertTypes.length)];
        this.addNewAlert(randomAlert.type, randomAlert.title, randomAlert.desc);
    }
    
    // Simulate incident
    simulateIncident() {
        const incidents = [
            { title: 'Revisión de Seguridad', desc: 'Inspección rutinaria de sistemas', status: 'pending' },
            { title: 'Mantenimiento Preventivo', desc: 'Actualización de firmware completada', status: 'resolved' },
            { title: 'Falsa Alarma', desc: 'Sensor de humo - Área de cocina', status: 'resolved' }
        ];
        
        const randomIncident = incidents[Math.floor(Math.random() * incidents.length)];
        this.addNewIncident(randomIncident.title, randomIncident.desc, randomIncident.status);
    }
    
    // Simulate camera issue
    simulateCameraIssue() {
        const onlineCameras = Array.from(this.cameras.values()).filter(cam => cam.status === 'online');
        if (onlineCameras.length === 0) return;
        
        const randomCamera = onlineCameras[Math.floor(Math.random() * onlineCameras.length)];
        
        // Temporarily disconnect camera
        this.disconnectCamera(randomCamera);
        
        // Add alert
        this.addNewAlert('warning', 'Cámara Desconectada', `${randomCamera.name} perdió conexión`);
        
        // Auto-reconnect after some time
        setTimeout(() => {
            this.reconnectCamera(randomCamera, randomCamera.element);
        }, 30000); // Reconnect after 30 seconds
    }
    
    // Disconnect camera
    disconnectCamera(camera) {
        const cameraFeed = camera.element;
        const statusElement = cameraFeed.querySelector('.camera-status');
        const viewportElement = cameraFeed.querySelector('.camera-viewport');
        
        statusElement.className = 'camera-status offline';
        statusElement.innerHTML = '<i class="fas fa-circle"></i>DESCONECTADA';
        
        viewportElement.classList.add('offline');
        viewportElement.innerHTML = `
            <div class="camera-placeholder">
                <i class="fas fa-video-slash"></i>
                <div class="offline-message">Sin señal</div>
            </div>
        `;
        
        camera.status = 'offline';
        this.updateCameraStats();
    }
    
    // Add new alert
    addNewAlert(type, title, description) {
        const alertsList = document.querySelector('.alerts-list');
        const alertItem = this.createAlertElement(type, title, description);
        
        alertItem.classList.add('new');
        alertsList.insertBefore(alertItem, alertsList.firstChild);
        
        // Setup event listeners for new alert
        this.setupAlertEventListeners(alertItem);
        
        // Update alert count
        this.updateAlertCount(1);
        
        // Auto-animate
        setTimeout(() => {
            alertItem.classList.remove('new');
        }, 300);
    }
    
    // Add new incident
    addNewIncident(title, description, status) {
        const incidentsTimeline = document.querySelector('.incidents-timeline');
        const incidentItem = this.createIncidentElement(title, description, status);
        
        incidentItem.classList.add('new');
        incidentsTimeline.insertBefore(incidentItem, incidentsTimeline.firstChild);
        
        // Update incidents count
        this.updateIncidentsCount(1);
        
        // Auto-animate
        setTimeout(() => {
            incidentItem.classList.remove('new');
        }, 300);
    }
    
    // Create alert element
    createAlertElement(type, title, description) {
        const alertItem = document.createElement('div');
        alertItem.className = `alert-item ${type}`;
        
        const icons = {
            'critical': 'fas fa-exclamation-triangle',
            'warning': 'fas fa-exclamation-circle',
            'info': 'fas fa-info-circle'
        };
        
        const actions = {
            'critical': '<button class="btn-small critical">Verificar</button><button class="btn-small">Descartar</button>',
            'warning': '<button class="btn-small warning">Revisar</button><button class="btn-small">Ignorar</button>',
            'info': '<button class="btn-small info">Revisar</button><button class="btn-small">OK</button>'
        };
        
        alertItem.innerHTML = `
            <div class="alert-icon">
                <i class="${icons[type]}"></i>
            </div>
            <div class="alert-content">
                <div class="alert-title">${title}</div>
                <div class="alert-description">${description}</div>
                <div class="alert-time">Ahora</div>
            </div>
            <div class="alert-actions">
                ${actions[type]}
            </div>
        `;
        
        return alertItem;
    }
    
    // Create incident element
    createIncidentElement(title, description, status) {
        const incidentItem = document.createElement('div');
        incidentItem.className = `incident-item ${status}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        const statusTexts = {
            'resolved': 'Resuelto',
            'pending': 'En proceso',
            'active': 'Activo'
        };
        
        incidentItem.innerHTML = `
            <div class="incident-time">${timeString}</div>
            <div class="incident-content">
                <div class="incident-title">${title}</div>
                <div class="incident-description">${description}</div>
                <div class="incident-status ${status}">${statusTexts[status]}</div>
            </div>
        `;
        
        return incidentItem;
    }
    
    // Setup alert event listeners
    setupAlertEventListeners(alertItem) {
        const actionButtons = alertItem.querySelectorAll('.alert-actions .btn-small');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => this.handleAlertAction(e));
        });
    }
    
    // Update system metrics
    updateSystemMetrics() {
        const components = Array.from(this.systemComponents.values());
        
        components.forEach(component => {
            if (Math.random() > 0.8) { // 20% chance to update
                this.updateComponentMetrics(component);
            }
        });
    }
    
    // Update component metrics
    updateComponentMetrics(component) {
        const metrics = component.element.querySelectorAll('.metric-value');
        
        metrics.forEach(metric => {
            const currentValue = metric.textContent;
            
            if (currentValue.includes('%')) {
                const value = parseInt(currentValue);
                const variation = Math.floor(Math.random() * 10) - 5; // ±5%
                const newValue = Math.max(0, Math.min(100, value + variation));
                this.animateMetricChange(metric, `${newValue}%`);
            }
        });
    }
    
    // Update statistics
    updateStatistics(action) {
        const statNumbers = document.querySelectorAll('.stat-number');
        
        statNumbers.forEach(statElement => {
            const card = statElement.closest('.stat-card');
            
            if (action === 'lockdown' && card.classList.contains('active-alerts')) {
                this.incrementStat(statElement);
            } else if (action === 'evacuation' && card.classList.contains('incidents-today')) {
                this.incrementStat(statElement);
            }
        });
    }
    
    // Update camera stats
    updateCameraStats() {
        const onlineCameras = Array.from(this.cameras.values()).filter(cam => cam.status === 'online').length;
        const totalCameras = this.cameras.size;
        
        const cameraStatElement = document.querySelector('.cameras-online .stat-number');
        if (cameraStatElement) {
            this.animateStatChange(cameraStatElement, `${onlineCameras}/${totalCameras}`);
        }
    }
    
    // Update alert count
    updateAlertCount(delta) {
        const alertCountElement = document.querySelector('.alert-count');
        const statElement = document.querySelector('.active-alerts .stat-number');
        
        if (alertCountElement && statElement) {
            const currentCount = parseInt(alertCountElement.textContent) || 0;
            const newCount = Math.max(0, currentCount + delta);
            
            alertCountElement.textContent = newCount;
            this.animateStatChange(statElement, newCount.toString());
        }
    }
    
    // Update incidents count
    updateIncidentsCount(delta) {
        const statElement = document.querySelector('.incidents-today .stat-number');
        
        if (statElement) {
            const currentCount = parseInt(statElement.textContent) || 0;
            const newCount = Math.max(0, currentCount + delta);
            this.animateStatChange(statElement, newCount.toString());
        }
    }
    
    // Utility functions
    extractAlertData(element) {
        return {
            title: element.querySelector('.alert-title')?.textContent || '',
            description: element.querySelector('.alert-description')?.textContent || '',
            time: element.querySelector('.alert-time')?.textContent || '',
            type: this.getAlertType(element)
        };
    }
    
    extractIncidentData(element) {
        return {
            title: element.querySelector('.incident-title')?.textContent || '',
            description: element.querySelector('.incident-description')?.textContent || '',
            time: element.querySelector('.incident-time')?.textContent || '',
            status: this.getIncidentStatus(element)
        };
    }
    
    extractComponentData(element) {
        return {
            name: element.querySelector('.component-name')?.textContent || '',
            status: element.querySelector('.component-status')?.textContent || '',
            type: this.getComponentType(element)
        };
    }
    
    getAlertType(element) {
        if (element.classList.contains('critical')) return 'critical';
        if (element.classList.contains('warning')) return 'warning';
        if (element.classList.contains('info')) return 'info';
        return 'info';
    }
    
    getIncidentStatus(element) {
        if (element.classList.contains('resolved')) return 'resolved';
        if (element.classList.contains('pending')) return 'pending';
        if (element.classList.contains('active')) return 'active';
        return 'pending';
    }
    
    getComponentType(element) {
        if (element.classList.contains('operational')) return 'operational';
        if (element.classList.contains('warning')) return 'warning';
        if (element.classList.contains('critical')) return 'critical';
        return 'operational';
    }
    
    getCameraAction(button) {
        const icon = button.querySelector('i');
        if (!icon) return 'unknown';
        
        const iconClass = icon.className;
        
        if (iconClass.includes('fa-search-plus')) return 'zoom';
        if (iconClass.includes('fa-camera')) return 'capture';
        if (iconClass.includes('fa-arrows-alt')) return 'ptz';
        if (iconClass.includes('fa-sync')) return 'reconnect';
        
        return 'unknown';
    }
    
    confirmEmergencyAction(action) {
        const messages = {
            'lockdown': '¿Está seguro de activar el BLOQUEO TOTAL? Esta acción cerrará todas las puertas.',
            'evacuation': '¿Está seguro de activar la EVACUACIÓN? Esta acción abrirá todas las salidas de emergencia.'
        };
        
        return confirm(messages[action] || '¿Está seguro de ejecutar esta acción?');
    }
    
    incrementStat(element) {
        const currentValue = parseInt(element.textContent) || 0;
        this.animateStatChange(element, (currentValue + 1).toString());
    }
    
    decrementStat(element) {
        const currentValue = parseInt(element.textContent) || 0;
        this.animateStatChange(element, Math.max(0, currentValue - 1).toString());
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
    
    animateMetricChange(element, newValue) {
        element.style.color = 'var(--primary-orange)';
        element.style.fontWeight = '700';
        
        setTimeout(() => {
            element.textContent = newValue;
            setTimeout(() => {
                element.style.color = '';
                element.style.fontWeight = '';
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
    
    showActionToast(action) {
        const messages = {
            'lockdown': 'Activando bloqueo total del edificio...',
            'evacuation': 'Iniciando protocolo de evacuación...',
            'security': 'Contactando equipo de seguridad...',
            'reset': 'Restableciendo sistema a estado normal...'
        };
        
        const message = messages[action] || `Ejecutando acción: ${action}`;
        
        if (window.fortenApp) {
            window.fortenApp.showToast(message, 'info');
        }
    }
    
    showCameraActionToast(action, cameraId) {
        const camera = this.cameras.get(cameraId);
        const cameraName = camera ? camera.name : cameraId;
        
        const messages = {
            'zoom': `Aplicando zoom - ${cameraName}`,
            'capture': `Capturando imagen - ${cameraName}`,
            'ptz': `Activando control PTZ - ${cameraName}`,
            'reconnect': `Reconectando cámara - ${cameraName}`
        };
        
        const message = messages[action] || `Acción ${action} - ${cameraName}`;
        
        if (window.fortenApp) {
            window.fortenApp.showToast(message, 'info');
        }
    }
    
    // Advanced features
    toggleViewAll() {
        const cameraGrid = document.querySelector('.camera-grid');
        cameraGrid.classList.toggle('fullscreen-mode');
        
        if (window.fortenApp) {
            window.fortenApp.showToast('Alternando vista completa de cámaras', 'info');
        }
    }
    
    toggleGridLayout() {
        const cameraGrid = document.querySelector('.camera-grid');
        const currentColumns = getComputedStyle(cameraGrid).gridTemplateColumns;
        
        if (currentColumns.includes('1fr 1fr')) {
            cameraGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
        } else {
            cameraGrid.style.gridTemplateColumns = '1fr 1fr';
        }
        
        if (window.fortenApp) {
            window.fortenApp.showToast('Cambiando diseño de grilla', 'info');
        }
    }
    
    lockAllDoors() {
        // Simulate locking all doors
        if (window.fortenApp) {
            window.fortenApp.showToast('Todas las puertas han sido bloqueadas', 'warning');
        }
    }
    
    openAllDoors() {
        // Simulate opening all emergency exits
        if (window.fortenApp) {
            window.fortenApp.showToast('Todas las salidas de emergencia abiertas', 'info');
        }
    }
    
    simulateSecurityResponse() {
        setTimeout(() => {
            if (window.fortenApp) {
                window.fortenApp.showToast('Equipo de seguridad en camino - ETA: 5 minutos', 'info');
            }
        }, 3000);
    }
    
    // Cleanup
    destroy() {
        if (this.realtimeUpdateInterval) {
            clearInterval(this.realtimeUpdateInterval);
        }
    }
}

// Initialize security module when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.securityModule = new SecurityModule();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.securityModule) {
        window.securityModule.destroy();
    }
});

// Add CSS animations for new elements
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        0% {
            opacity: 0;
            transform: translateY(20px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeOut {
        0% {
            opacity: 1;
            transform: translateX(0);
        }
        100% {
            opacity: 0;
            transform: translateX(20px);
        }
    }
    
    .alert-item.new,
    .incident-item.new {
        animation: fadeInUp 0.5s ease forwards;
    }
    
    .camera-feed.expanded {
        transform: scale(1.1);
        z-index: 10;
        position: relative;
    }
    
    .camera-feed.zoomed .camera-viewport {
        transform: scale(1.2);
        transition: transform 0.3s ease;
    }
    
    .reviewed-label {
        font-size: 0.75rem;
        color: var(--success);
        font-weight: 600;
        font-style: italic;
    }
    
    .fullscreen-mode {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--primary-black);
        z-index: 9999;
        padding: 2rem;
        overflow-y: auto;
        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)) !important;
    }
`;

document.head.appendChild(style);