"use client";

import styled from '@emotion/styled';
import { theme } from '@/lib/theme';
import { UserIcon } from '@heroicons/react/24/solid';

const Container = styled.div<{ size: string }>`
  position: relative;
  width: ${props => {
    switch (props.size) {
      case 'sm': return '32px';
      case 'md': return '40px';
      case 'lg': return '56px';
      case 'xl': return '80px';
      default: return '40px';
    }
  }};
  height: ${props => {
    switch (props.size) {
      case 'sm': return '32px';
      case 'md': return '40px';
      case 'lg': return '56px';
      case 'xl': return '80px';
      default: return '40px';
    }
  }};
  flex-shrink: 0;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: ${theme.borderRadius.full};
  object-fit: cover;
  background: ${theme.colors.gray[100]};
  
  @media (prefers-color-scheme: dark) {
    background: ${theme.colors.gray[800]};
  }
`;

const Fallback = styled.div<{ size: string }>`
  width: 100%;
  height: 100%;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.primary[500]};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => {
    switch (props.size) {
      case 'sm': return theme.typography.fontSize.xs;
      case 'md': return theme.typography.fontSize.sm;
      case 'lg': return theme.typography.fontSize.lg;
      case 'xl': return theme.typography.fontSize['2xl'];
      default: return theme.typography.fontSize.sm;
    }
  }};
  font-weight: ${theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  user-select: none;

  svg {
    width: ${props => {
      switch (props.size) {
        case 'sm': return '16px';
        case 'md': return '20px';
        case 'lg': return '28px';
        case 'xl': return '40px';
        default: return '20px';
      }
    }};
    height: ${props => {
      switch (props.size) {
        case 'sm': return '16px';
        case 'md': return '20px';
        case 'lg': return '28px';
        case 'xl': return '40px';
        default: return '20px';
      }
    }};
  }
`;

const StatusIndicator = styled.div<{ status: string; size: string }>`
  position: absolute;
  bottom: 0;
  right: 0;
  width: ${props => {
    switch (props.size) {
      case 'sm': return '8px';
      case 'md': return '10px';
      case 'lg': return '14px';
      case 'xl': return '20px';
      default: return '10px';
    }
  }};
  height: ${props => {
    switch (props.size) {
      case 'sm': return '8px';
      case 'md': return '10px';
      case 'lg': return '14px';
      case 'xl': return '20px';
      default: return '10px';
    }
  }};
  border-radius: ${theme.borderRadius.full};
  background: ${props => {
    switch (props.status) {
      case 'online': return theme.colors.success[500];
      case 'away': return theme.colors.warning[500];
      case 'busy': return theme.colors.error[500];
      default: return theme.colors.gray[400];
    }
  }};
  border: 2px solid white;
  
  @media (prefers-color-scheme: dark) {
    border-color: ${theme.colors.gray[900]};
  }
`;

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'busy' | 'offline';
}

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return parts[0][0] + parts[parts.length - 1][0];
  }
  return name.slice(0, 2);
}

export function Avatar({ src, name, size = 'md', status }: AvatarProps) {
  const initials = name ? getInitials(name) : '';

  return (
    <Container size={size}>
      {src ? (
        <AvatarImage src={src} alt={name || 'Avatar'} />
      ) : (
        <Fallback size={size}>
          {initials || <UserIcon />}
        </Fallback>
      )}
      {status && <StatusIndicator status={status} size={size} />}
    </Container>
  );
}