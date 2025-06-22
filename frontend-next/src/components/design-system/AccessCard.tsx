"use client";

import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import { theme } from '@/lib/theme';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { StatusIndicator } from './StatusIndicator';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const Container = styled(motion.div)`
  background: white;
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing.md};
  box-shadow: ${theme.shadows.base};
  border: 1px solid ${theme.colors.gray[200]};
  transition: all ${theme.transitions.base};
  cursor: pointer;

  &:hover {
    box-shadow: ${theme.shadows.md};
    transform: translateY(-2px);
  }

  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.gray[800]};
    border-color: ${theme.colors.gray[700]};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing.sm};
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const UserDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const Name = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.gray[900]};
  margin: 0;

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[100]};
  }
`;

const Subtitle = styled.p`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.gray[600]};
  margin: 0;

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[400]};
  }
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: ${theme.typography.fontSize.sm};
`;

const Label = styled.span`
  color: ${theme.colors.gray[600]};

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[400]};
  }
`;

const Value = styled.span`
  color: ${theme.colors.gray[900]};
  font-weight: ${theme.typography.fontWeight.medium};

  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[100]};
  }
`;

const PinCode = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.primary[50]};
  color: ${theme.colors.primary[700]};
  border-radius: ${theme.borderRadius.md};
  font-family: ${theme.typography.fontFamily.mono};
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.bold};
  letter-spacing: 0.1em;

  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.primary[900]};
    color: ${theme.colors.primary[200]};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: ${theme.spacing.xs};
  margin-top: ${theme.spacing.sm};
  padding-top: ${theme.spacing.sm};
  border-top: 1px solid ${theme.colors.gray[200]};

  @media (prefers-color-scheme: dark) {
    border-color: ${theme.colors.gray[700]};
  }
`;

const ActionButton = styled(motion.button)`
  flex: 1;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  border: 1px solid ${theme.colors.gray[300]};
  background: white;
  color: ${theme.colors.gray[700]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all ${theme.transitions.fast};

  &:hover {
    background: ${theme.colors.gray[50]};
    border-color: ${theme.colors.gray[400]};
  }

  &:active {
    transform: scale(0.98);
  }

  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.gray[700]};
    color: ${theme.colors.gray[200]};
    border-color: ${theme.colors.gray[600]};

    &:hover {
      background: ${theme.colors.gray[600]};
      border-color: ${theme.colors.gray[500]};
    }
  }
`;

export interface AccessCardProps {
  id: string;
  name: string;
  type: 'resident' | 'visitor' | 'delivery' | 'service' | 'contractor';
  apartment?: string;
  company?: string;
  pin?: string;
  validFrom: Date;
  validUntil: Date;
  photo?: string;
  status: 'active' | 'expired' | 'used';
  uses?: number;
  maxUses?: number;
  onExtend?: () => void;
  onRevoke?: () => void;
  onView?: () => void;
  onClick?: () => void;
}

const typeLabels = {
  resident: 'Residente',
  visitor: 'Visitante',
  delivery: 'Delivery',
  service: 'Servicio',
  contractor: 'Contratista'
};

const typeColors = {
  resident: 'primary',
  visitor: 'success',
  delivery: 'warning',
  service: 'info',
  contractor: 'secondary'
} as const;

export function AccessCard({
  id,
  name,
  type,
  apartment,
  company,
  pin,
  validFrom,
  validUntil,
  photo,
  status,
  uses = 0,
  maxUses,
  onExtend,
  onRevoke,
  onView,
  onClick
}: AccessCardProps) {
  const isActive = status === 'active' && new Date() < validUntil;
  const timeRemaining = formatDistanceToNow(validUntil, { 
    addSuffix: true,
    locale: es 
  });

  return (
    <Container
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Header>
        <UserInfo>
          <Avatar
            src={photo}
            name={name}
            size="md"
          />
          <UserDetails>
            <Name>{name}</Name>
            <Subtitle>
              {apartment && `Apto ${apartment}`}
              {company && ` • ${company}`}
            </Subtitle>
          </UserDetails>
        </UserInfo>
        <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
          <StatusIndicator status={isActive ? 'online' : 'offline'} />
          <Badge
            variant={typeColors[type]}
            size="sm"
          >
            {typeLabels[type]}
          </Badge>
        </div>
      </Header>

      <Content>
        {pin && (
          <InfoRow>
            <Label>PIN de acceso</Label>
            <PinCode>{pin}</PinCode>
          </InfoRow>
        )}

        <InfoRow>
          <Label>Válido hasta</Label>
          <Value>{timeRemaining}</Value>
        </InfoRow>

        {maxUses && (
          <InfoRow>
            <Label>Usos</Label>
            <Value>{uses} / {maxUses}</Value>
          </InfoRow>
        )}
      </Content>

      {(onExtend || onRevoke || onView) && (
        <Actions onClick={(e) => e.stopPropagation()}>
          {onView && (
            <ActionButton
              onClick={onView}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Ver detalles
            </ActionButton>
          )}
          {onExtend && isActive && (
            <ActionButton
              onClick={onExtend}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Extender
            </ActionButton>
          )}
          {onRevoke && isActive && (
            <ActionButton
              onClick={onRevoke}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{
                color: theme.colors.error[600],
                borderColor: theme.colors.error[300]
              }}
            >
              Revocar
            </ActionButton>
          )}
        </Actions>
      )}
    </Container>
  );
}