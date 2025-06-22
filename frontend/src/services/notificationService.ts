import toast from 'react-hot-toast';
import { 
  Security, 
  Person, 
  DirectionsCar, 
  Warning, 
  Pets, 
  LocalShipping,
  CheckCircle,
  ErrorOutline,
  Info,
  NotificationImportant
} from '@mui/icons-material';
import React from 'react';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  style?: React.CSSProperties;
}

// Custom toast component for AI alerts
const AIAlertToast: React.FC<{
  type: string;
  title: string;
  location: string;
  confidence: number;
  onDismiss: () => void;
}> = ({ type, title, location, confidence, onDismiss }) => {
  const getIcon = () => {
    switch (type) {
      case 'person': return React.createElement(Person, { sx: { fontSize: 20 } });
      case 'vehicle': return React.createElement(DirectionsCar, { sx: { fontSize: 20 } });
      case 'unauthorized_access': return React.createElement(Security, { sx: { fontSize: 20 } });
      case 'suspicious_behavior': return React.createElement(Warning, { sx: { fontSize: 20 } });
      case 'object': return React.createElement(LocalShipping, { sx: { fontSize: 20 } });
      case 'animal': return React.createElement(Pets, { sx: { fontSize: 20 } });
      default: return React.createElement(NotificationImportant, { sx: { fontSize: 20 } });
    }
  };

  const getColor = () => {
    switch (type) {
      case 'person': return '#2196F3';
      case 'vehicle': return '#FF9800';
      case 'unauthorized_access': return '#F44336';
      case 'suspicious_behavior': return '#FF6B35';
      case 'object': return '#9C27B0';
      case 'animal': return '#4CAF50';
      default: return '#FF6B35';
    }
  };

  return React.createElement('div', {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '4px 0',
      width: '100%',
    }
  }, [
    React.createElement('div', {
      key: 'icon',
      style: {
        width: '32px',
        height: '32px',
        borderRadius: '6px',
        backgroundColor: getColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        flexShrink: 0,
      }
    }, getIcon()),
    React.createElement('div', {
      key: 'content',
      style: { flex: 1, minWidth: 0 }
    }, [
      React.createElement('div', {
        key: 'title',
        style: {
          fontWeight: 600,
          fontSize: '14px',
          marginBottom: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }
      }, title),
      React.createElement('div', {
        key: 'details',
        style: {
          fontSize: '12px',
          opacity: 0.8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }
      }, [
        React.createElement('span', { key: 'location' }, location),
        React.createElement('span', { 
          key: 'confidence',
          style: { fontWeight: 500 }
        }, `${(confidence * 100).toFixed(0)}%`)
      ])
    ])
  ]);
};

export class NotificationService {
  static success(message: string, options?: NotificationOptions) {
    return toast.success(message, {
      duration: options?.duration || 3000,
      ...options,
    });
  }

  static error(message: string, options?: NotificationOptions) {
    return toast.error(message, {
      duration: options?.duration || 5000,
      ...options,
    });
  }

  static info(message: string, options?: NotificationOptions) {
    return toast(message, {
      icon: React.createElement(Info, { sx: { color: '#8AB4F8' } }),
      duration: options?.duration || 4000,
      style: {
        background: 'rgba(138, 180, 248, 0.1)',
        color: '#8AB4F8',
        border: '1px solid rgba(138, 180, 248, 0.3)',
        ...options?.style,
      },
    });
  }

  static warning(message: string, options?: NotificationOptions) {
    return toast(message, {
      icon: React.createElement(Warning, { sx: { color: '#FDD663' } }),
      duration: options?.duration || 4000,
      style: {
        background: 'rgba(253, 214, 99, 0.1)',
        color: '#FDD663',
        border: '1px solid rgba(253, 214, 99, 0.3)',
        ...options?.style,
      },
    });
  }

  static loading(message: string, options?: NotificationOptions) {
    return toast.loading(message, options);
  }

  static promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: NotificationOptions
  ) {
    return toast.promise(promise, messages, options);
  }

  // Custom notification for AI alerts
  static aiAlert(alertData: {
    type: 'person' | 'vehicle' | 'unauthorized_access' | 'suspicious_behavior' | 'object' | 'animal';
    title: string;
    location: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }, options?: NotificationOptions) {
    const duration = alertData.severity === 'critical' ? 6000 : 
                    alertData.severity === 'high' ? 4000 : 3000;

    return toast.custom((t) => 
      React.createElement(AIAlertToast, {
        type: alertData.type,
        title: alertData.title,
        location: alertData.location,
        confidence: alertData.confidence,
        onDismiss: () => toast.dismiss(t.id),
      }),
      {
        duration,
        style: {
          background: 'rgba(255, 107, 53, 0.1)',
          border: '1px solid rgba(255, 107, 53, 0.3)',
          ...options?.style,
        },
        ...options,
      }
    );
  }

  // System notifications
  static systemAlert(message: string, type: 'security' | 'system' | 'access' = 'system') {
    const icons = {
      security: React.createElement(Security, { sx: { color: '#F28B82' } }),
      system: React.createElement(Info, { sx: { color: '#8AB4F8' } }),
      access: React.createElement(CheckCircle, { sx: { color: '#81C995' } }),
    };

    const colors = {
      security: {
        background: 'rgba(242, 139, 130, 0.1)',
        color: '#F28B82',
        border: '1px solid rgba(242, 139, 130, 0.3)',
      },
      system: {
        background: 'rgba(138, 180, 248, 0.1)',
        color: '#8AB4F8',
        border: '1px solid rgba(138, 180, 248, 0.3)',
      },
      access: {
        background: 'rgba(129, 201, 149, 0.1)',
        color: '#81C995',
        border: '1px solid rgba(129, 201, 149, 0.3)',
      },
    };

    return toast(message, {
      icon: icons[type],
      duration: type === 'security' ? 6000 : 4000,
      style: colors[type],
    });
  }

  // Dismiss specific toast
  static dismiss(toastId?: string) {
    toast.dismiss(toastId);
  }

  // Remove all toasts
  static remove() {
    toast.remove();
  }
}

// Export default instance
export default NotificationService;