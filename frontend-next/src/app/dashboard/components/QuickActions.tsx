"use client";

import { useState } from 'react';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';
import { api } from '@/lib/api';
import { useNotifications } from '@/contexts/NotificationContext';

const Container = styled.div`
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows.sm};
  border: 1px solid ${theme.colors.gray[200]};
  padding: ${theme.spacing.lg};

  .dark & {
    background: ${theme.colors.gray[800]};
    border-color: ${theme.colors.gray[700]};
  }
`;

const ActionsGrid = styled.div`
  display: grid;
  gap: ${theme.spacing.md};
`;

const ActionButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  width: 100%;
  padding: ${theme.spacing.md};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  transition: all 0.2s;
  border: none;
  cursor: pointer;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: ${theme.colors.blue[500]};
          color: ${theme.colors.white};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.blue[600]};
          }
        `;
      case 'danger':
        return `
          background: ${theme.colors.red[500]};
          color: ${theme.colors.white};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.red[600]};
          }
        `;
      default:
        return `
          background: ${theme.colors.gray[100]};
          color: ${theme.colors.gray[700]};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.gray[200]};
          }
          
          .dark & {
            background: ${theme.colors.gray[700]};
            color: ${theme.colors.gray[200]};
            
            &:hover:not(:disabled) {
              background: ${theme.colors.gray[600]};
            }
          }
        `;
    }
  }}
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
`;

const ModalContent = styled.div`
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.xl};
  max-width: 400px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  
  .dark & {
    background: ${theme.colors.gray[800]};
  }
`;

const ModalTitle = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.gray[900]};
  margin-bottom: ${theme.spacing.md};
  
  .dark & {
    color: ${theme.colors.white};
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing.md};
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.gray[700]};
  margin-bottom: ${theme.spacing.xs};
  
  .dark & {
    color: ${theme.colors.gray[300]};
  }
`;

const Input = styled.input`
  width: 100%;
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.blue[500]};
    box-shadow: 0 0 0 3px ${theme.colors.blue[100]};
  }
  
  .dark & {
    background: ${theme.colors.gray[700]};
    border-color: ${theme.colors.gray[600]};
    color: ${theme.colors.white};
    
    &:focus {
      border-color: ${theme.colors.blue[400]};
      box-shadow: 0 0 0 3px ${theme.colors.blue[900]};
    }
  }
`;

const Select = styled.select`
  width: 100%;
  padding: ${theme.spacing.sm};
  border: 1px solid ${theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  background: ${theme.colors.white};
  
  &:focus {
    outline: none;
    border-color: ${theme.colors.blue[500]};
    box-shadow: 0 0 0 3px ${theme.colors.blue[100]};
  }
  
  .dark & {
    background: ${theme.colors.gray[700]};
    border-color: ${theme.colors.gray[600]};
    color: ${theme.colors.white};
    
    &:focus {
      border-color: ${theme.colors.blue[400]};
      box-shadow: 0 0 0 3px ${theme.colors.blue[900]};
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  margin-top: ${theme.spacing.lg};
`;

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  variant?: 'primary' | 'secondary' | 'danger';
  action: () => void;
}

export function QuickActions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'pin' | 'alert' | null>(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const [pinForm, setPinForm] = useState({
    visitorName: '',
    apartment: '',
    duration: '4'
  });

  const [alertForm, setAlertForm] = useState({
    type: 'security',
    title: '',
    message: ''
  });

  const handleGeneratePin = async () => {
    setLoading(true);
    try {
      const response = await api.post('/access/generate-pin', {
        visitorName: pinForm.visitorName,
        apartment: pinForm.apartment,
        duration: parseInt(pinForm.duration),
        type: 'temporary'
      });

      addNotification({
        type: 'success',
        title: 'PIN Generado',
        message: `PIN ${response.data.pin} creado para ${pinForm.visitorName}`
      });

      setIsModalOpen(false);
      setPinForm({ visitorName: '', apartment: '', duration: '4' });
    } catch {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo generar el PIN'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendAlert = async () => {
    setLoading(true);
    try {
      await api.post('/notifications/broadcast', {
        type: alertForm.type,
        title: alertForm.title,
        message: alertForm.message,
        priority: 'high'
      });

      addNotification({
        type: 'success',
        title: 'Alerta Enviada',
        message: 'Notificación enviada a todos los residentes'
      });

      setIsModalOpen(false);
      setAlertForm({ type: 'security', title: '', message: '' });
    } catch {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo enviar la alerta'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLockdownToggle = async () => {
    setLoading(true);
    try {
      await api.post('/building/lockdown/toggle');
      
      addNotification({
        type: 'warning',
        title: 'Modo Seguridad',
        message: 'Estado de bloqueo del edificio actualizado'
      });
    } catch {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cambiar el estado de seguridad'
      });
    } finally {
      setLoading(false);
    }
  };

  const actions: QuickAction[] = [
    {
      id: 'generate-pin',
      label: 'Generar PIN Temporal',
      icon: '🔢',
      variant: 'primary',
      action: () => {
        setModalType('pin');
        setIsModalOpen(true);
      }
    },
    {
      id: 'emergency-alert',
      label: 'Enviar Alerta General',
      icon: '📢',
      variant: 'secondary',
      action: () => {
        setModalType('alert');
        setIsModalOpen(true);
      }
    },
    {
      id: 'lockdown',
      label: 'Modo Seguridad',
      icon: '🔒',
      variant: 'danger',
      action: handleLockdownToggle
    },
    {
      id: 'camera-check',
      label: 'Verificar Cámaras',
      icon: '📹',
      action: async () => {
        setLoading(true);
        try {
          await api.post('/cameras/health-check');
          addNotification({
            type: 'success',
            title: 'Verificación Completa',
            message: 'Estado de cámaras actualizado'
          });
        } catch {
          addNotification({
            type: 'error',
            title: 'Error',
            message: 'No se pudo verificar las cámaras'
          });
        } finally {
          setLoading(false);
        }
      }
    },
    {
      id: 'sync-data',
      label: 'Sincronizar Datos',
      icon: '🔄',
      action: async () => {
        setLoading(true);
        try {
          await api.post('/system/sync');
          addNotification({
            type: 'success',
            title: 'Sincronización Completa',
            message: 'Datos actualizados correctamente'
          });
        } catch {
          addNotification({
            type: 'error',
            title: 'Error',
            message: 'Error en la sincronización'
          });
        } finally {
          setLoading(false);
        }
      }
    },
    {
      id: 'backup',
      label: 'Respaldar Sistema',
      icon: '💾',
      action: async () => {
        setLoading(true);
        try {
          await api.post('/system/backup');
          addNotification({
            type: 'success',
            title: 'Respaldo Creado',
            message: 'Sistema respaldado exitosamente'
          });
        } catch {
          addNotification({
            type: 'error',
            title: 'Error',
            message: 'No se pudo crear el respaldo'
          });
        } finally {
          setLoading(false);
        }
      }
    }
  ];

  return (
    <>
      <Container>
        <ActionsGrid>
          {actions.map(action => (
            <ActionButton
              key={action.id}
              variant={action.variant}
              onClick={action.action}
              disabled={loading}
            >
              <span className="text-lg">{action.icon}</span>
              {action.label}
            </ActionButton>
          ))}
        </ActionsGrid>
      </Container>

      {isModalOpen && (
        <Modal onClick={() => setIsModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            {modalType === 'pin' && (
              <>
                <ModalTitle>Generar PIN Temporal</ModalTitle>
                <FormGroup>
                  <Label>Nombre del Visitante</Label>
                  <Input
                    type="text"
                    value={pinForm.visitorName}
                    onChange={(e) => setPinForm({ ...pinForm, visitorName: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Apartamento</Label>
                  <Input
                    type="text"
                    value={pinForm.apartment}
                    onChange={(e) => setPinForm({ ...pinForm, apartment: e.target.value })}
                    placeholder="Ej: Apto 501"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Duración (horas)</Label>
                  <Select
                    value={pinForm.duration}
                    onChange={(e) => setPinForm({ ...pinForm, duration: e.target.value })}
                  >
                    <option value="1">1 hora</option>
                    <option value="2">2 horas</option>
                    <option value="4">4 horas</option>
                    <option value="8">8 horas</option>
                    <option value="24">24 horas</option>
                  </Select>
                </FormGroup>
                <ButtonGroup>
                  <ActionButton
                    variant="primary"
                    onClick={handleGeneratePin}
                    disabled={loading || !pinForm.visitorName || !pinForm.apartment}
                  >
                    Generar PIN
                  </ActionButton>
                  <ActionButton onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </ActionButton>
                </ButtonGroup>
              </>
            )}

            {modalType === 'alert' && (
              <>
                <ModalTitle>Enviar Alerta General</ModalTitle>
                <FormGroup>
                  <Label>Tipo de Alerta</Label>
                  <Select
                    value={alertForm.type}
                    onChange={(e) => setAlertForm({ ...alertForm, type: e.target.value })}
                  >
                    <option value="security">Seguridad</option>
                    <option value="maintenance">Mantenimiento</option>
                    <option value="emergency">Emergencia</option>
                    <option value="general">General</option>
                  </Select>
                </FormGroup>
                <FormGroup>
                  <Label>Título</Label>
                  <Input
                    type="text"
                    value={alertForm.title}
                    onChange={(e) => setAlertForm({ ...alertForm, title: e.target.value })}
                    placeholder="Ej: Corte de agua programado"
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Mensaje</Label>
                  <Input
                    type="text"
                    value={alertForm.message}
                    onChange={(e) => setAlertForm({ ...alertForm, message: e.target.value })}
                    placeholder="Detalle de la alerta..."
                  />
                </FormGroup>
                <ButtonGroup>
                  <ActionButton
                    variant="primary"
                    onClick={handleSendAlert}
                    disabled={loading || !alertForm.title || !alertForm.message}
                  >
                    Enviar Alerta
                  </ActionButton>
                  <ActionButton onClick={() => setIsModalOpen(false)}>
                    Cancelar
                  </ActionButton>
                </ButtonGroup>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </>
  );
}