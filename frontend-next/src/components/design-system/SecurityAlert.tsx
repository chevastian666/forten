"use client";

import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/lib/theme';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  BellAlertIcon,
  FireIcon,
  XMarkIcon,
  CheckIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const Container = styled(motion.div)<{ severity: string }>`
  background: ${props => {
    switch (props.severity) {
      case 'critical': return theme.colors.error[50];
      case 'high': return theme.colors.warning[50];
      case 'medium': return theme.colors.primary[50];
      default: return theme.colors.gray[50];
    }
  }};
  border: 1px solid ${props => {
    switch (props.severity) {
      case 'critical': return theme.colors.error[200];
      case 'high': return theme.colors.warning[200];
      case 'medium': return theme.colors.primary[200];
      default: return theme.colors.gray[200];
    }
  }};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing.md};
  margin-bottom: ${theme.spacing.sm};
  box-shadow: ${theme.shadows.sm};

  @media (prefers-color-scheme: dark) {
    background: ${props => {
      switch (props.severity) {
        case 'critical': return theme.colors.error[950];
        case 'high': return theme.colors.warning[950];
        case 'medium': return theme.colors.primary[950];
        default: return theme.colors.gray[800];
      }
    }};
    border-color: ${props => {
      switch (props.severity) {
        case 'critical': return theme.colors.error[800];
        case 'high': return theme.colors.warning[800];
        case 'medium': return theme.colors.primary[800];
        default: return theme.colors.gray[700];
      }
    }};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.sm};
`;

const IconWrapper = styled.div<{ severity: string }>`
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${theme.borderRadius.full};
  background: ${props => {
    switch (props.severity) {
      case 'critical': return theme.colors.error[100];
      case 'high': return theme.colors.warning[100];
      case 'medium': return theme.colors.primary[100];
      default: return theme.colors.gray[100];
    }
  }};
  color: ${props => {
    switch (props.severity) {
      case 'critical': return theme.colors.error[600];
      case 'high': return theme.colors.warning[600];
      case 'medium': return theme.colors.primary[600];
      default: return theme.colors.gray[600];
    }
  }};

  svg {
    width: 24px;
    height: 24px;
  }

  @media (prefers-color-scheme: dark) {
    background: ${props => {
      switch (props.severity) {
        case 'critical': return theme.colors.error[900];
        case 'high': return theme.colors.warning[900];
        case 'medium': return theme.colors.primary[900];
        default: return theme.colors.gray[700];
      }
    }};
    color: ${props => {
      switch (props.severity) {
        case 'critical': return theme.colors.error[200];
        case 'high': return theme.colors.warning[200];
        case 'medium': return theme.colors.primary[200];
        default: return theme.colors.gray[200];
      }
    }};
  }
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.h4`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.gray[900]};
  margin: 0 0 ${theme.spacing.xs} 0;

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[100]};
  }
`;

const Description = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.gray[600]};
  margin: 0 0 ${theme.spacing.xs} 0;
  line-height: 1.5;

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[400]};
  }
`;

const Metadata = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.gray[500]};

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[500]};
  }
`;

const Location = styled.span`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  &::before {
    content: '•';
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.sm};
`;

const ActionButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border: 1px solid ${props => 
    props.variant === 'primary' ? 'transparent' : theme.colors.gray[300]
  };
  background: ${props => 
    props.variant === 'primary' ? theme.colors.primary[600] : 'white'
  };
  color: ${props => 
    props.variant === 'primary' ? 'white' : theme.colors.gray[700]
  };
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${props => 
      props.variant === 'primary' ? theme.colors.primary[700] : theme.colors.gray[50]
    };
  }

  svg {
    width: 16px;
    height: 16px;
  }

  @media (prefers-color-scheme: dark) {
    background: ${props => 
      props.variant === 'primary' ? theme.colors.primary[600] : theme.colors.gray[700]
    };
    color: ${props => 
      props.variant === 'primary' ? 'white' : theme.colors.gray[200]
    };
    border-color: ${props => 
      props.variant === 'primary' ? 'transparent' : theme.colors.gray[600]
    };

    &:hover {
      background: ${props => 
        props.variant === 'primary' ? theme.colors.primary[700] : theme.colors.gray[600]
      };
    }
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: ${theme.spacing.sm};
  right: ${theme.spacing.sm};
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: ${theme.colors.gray[500]};
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.gray[100]};
    color: ${theme.colors.gray[700]};
  }

  svg {
    width: 20px;
    height: 20px;
  }

  @media (prefers-color-scheme: dark) {
    &:hover {
      background: ${theme.colors.gray[700]};
      color: ${theme.colors.gray[300]};
    }
  }
`;

export interface SecurityAlertProps {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: string;
  timestamp: Date;
  status?: 'active' | 'acknowledged' | 'resolved';
  assignedTo?: string;
  onAcknowledge?: () => void;
  onResolve?: () => void;
  onView?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
}

const iconMap = {
  motion: ExclamationTriangleIcon,
  access: ShieldExclamationIcon,
  alarm: BellAlertIcon,
  fire: FireIcon,
  default: ExclamationTriangleIcon
};

export function SecurityAlert({
  id,
  type,
  severity,
  title,
  description,
  location,
  timestamp,
  status = 'active',
  assignedTo,
  onAcknowledge,
  onResolve,
  onView,
  onDismiss,
  dismissible = true
}: SecurityAlertProps) {
  const Icon = iconMap[type as keyof typeof iconMap] || iconMap.default;
  const timeAgo = formatDistanceToNow(timestamp, { 
    addSuffix: true, 
    locale: es 
  });

  return (
    <AnimatePresence>
      <Container
        severity={severity}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.2 }}
        layout
      >
        <Header>
          <IconWrapper severity={severity}>
            <Icon />
          </IconWrapper>
          
          <Content>
            <Title>{title}</Title>
            <Description>{description}</Description>
            
            <Metadata>
              <span>{timeAgo}</span>
              {location && <Location>{location}</Location>}
              {assignedTo && (
                <Location>Asignado a {assignedTo}</Location>
              )}
            </Metadata>

            {(onAcknowledge || onResolve || onView) && (
              <Actions>
                {status === 'active' && onAcknowledge && (
                  <ActionButton
                    variant="primary"
                    onClick={onAcknowledge}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CheckIcon />
                    Reconocer
                  </ActionButton>
                )}
                
                {status === 'acknowledged' && onResolve && (
                  <ActionButton
                    variant="primary"
                    onClick={onResolve}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CheckIcon />
                    Resolver
                  </ActionButton>
                )}
                
                {onView && (
                  <ActionButton
                    onClick={onView}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Ver detalles
                    <ChevronRightIcon />
                  </ActionButton>
                )}
              </Actions>
            )}
          </Content>
        </Header>

        {dismissible && onDismiss && (
          <CloseButton
            onClick={onDismiss}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <XMarkIcon />
          </CloseButton>
        )}
      </Container>
    </AnimatePresence>
  );
}