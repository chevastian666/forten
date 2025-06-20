"use client";

import styled from '@emotion/styled';
import { theme } from '@/lib/theme';

const Indicator = styled.div<{ status: string; size: string; pulse?: boolean }>`
  display: inline-block;
  width: ${props => props.size === 'sm' ? '8px' : props.size === 'lg' ? '16px' : '12px'};
  height: ${props => props.size === 'sm' ? '8px' : props.size === 'lg' ? '16px' : '12px'};
  border-radius: ${theme.borderRadius.full};
  background: ${props => {
    switch (props.status) {
      case 'online':
      case 'active':
      case 'success':
        return theme.colors.success[500];
      case 'away':
      case 'warning':
      case 'pending':
        return theme.colors.warning[500];
      case 'busy':
      case 'error':
      case 'offline':
        return theme.colors.error[500];
      case 'idle':
      case 'inactive':
      default:
        return theme.colors.gray[400];
    }
  }};
  position: relative;

  ${props => props.pulse && `
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: ${theme.borderRadius.full};
      background: inherit;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
        transform: scale(1.5);
      }
    }
  `}
`;

const Container = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
`;

const Label = styled.span<{ size: string }>`
  font-size: ${props => props.size === 'sm' ? theme.typography.fontSize.xs : theme.typography.fontSize.sm};
  color: ${theme.colors.gray[600]};
  
  @media (prefers-color-scheme: dark) {
    color: ${theme.colors.gray[400]};
  }
`;

export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'active' | 'inactive' | 'success' | 'error' | 'warning' | 'pending' | 'away' | 'busy' | 'idle';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  pulse?: boolean;
}

export function StatusIndicator({ status, size = 'md', label, pulse = false }: StatusIndicatorProps) {
  if (label) {
    return (
      <Container>
        <Indicator status={status} size={size} pulse={pulse} />
        <Label size={size}>{label}</Label>
      </Container>
    );
  }

  return <Indicator status={status} size={size} pulse={pulse} />;
}