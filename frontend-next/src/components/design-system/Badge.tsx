"use client";

import styled from '@emotion/styled';
import { theme } from '@/lib/theme';

const StyledBadge = styled.span<{ variant: string; size: string }>`
  display: inline-flex;
  align-items: center;
  padding: ${props => props.size === 'sm' ? '2px 8px' : '4px 12px'};
  font-size: ${props => props.size === 'sm' ? theme.typography.fontSize.xs : theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  border-radius: ${theme.borderRadius.full};
  transition: all ${theme.transitions.fast};
  
  ${props => {
    const colors = {
      primary: {
        bg: theme.colors.primary[100],
        color: theme.colors.primary[700],
        darkBg: theme.colors.primary[900],
        darkColor: theme.colors.primary[200]
      },
      secondary: {
        bg: theme.colors.gray[100],
        color: theme.colors.gray[700],
        darkBg: theme.colors.gray[700],
        darkColor: theme.colors.gray[200]
      },
      success: {
        bg: theme.colors.success[100],
        color: theme.colors.success[700],
        darkBg: theme.colors.success[900],
        darkColor: theme.colors.success[200]
      },
      warning: {
        bg: theme.colors.warning[100],
        color: theme.colors.warning[700],
        darkBg: theme.colors.warning[900],
        darkColor: theme.colors.warning[200]
      },
      error: {
        bg: theme.colors.error[100],
        color: theme.colors.error[700],
        darkBg: theme.colors.error[900],
        darkColor: theme.colors.error[200]
      },
      info: {
        bg: theme.colors.primary[100],
        color: theme.colors.primary[700],
        darkBg: theme.colors.primary[900],
        darkColor: theme.colors.primary[200]
      }
    };
    
    const variant = colors[props.variant as keyof typeof colors] || colors.secondary;
    
    return `
      background: ${variant.bg};
      color: ${variant.color};
      
      @media (prefers-color-scheme: dark) {
        background: ${variant.darkBg};
        color: ${variant.darkColor};
      }
    `;
  }}
`;

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ 
  children, 
  variant = 'secondary',
  size = 'md' 
}: BadgeProps) {
  return (
    <StyledBadge variant={variant} size={size}>
      {children}
    </StyledBadge>
  );
}