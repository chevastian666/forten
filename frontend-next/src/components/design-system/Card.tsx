import React from 'react';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'elevated';
  hover?: boolean;
}

const StyledCard = styled.div<{
  $padding: CardProps['padding'];
  $variant: CardProps['variant'];
  $hover: boolean;
}>`
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.lg};
  transition: all 0.2s ease-in-out;
  
  .dark & {
    background: ${theme.colors.gray[800]};
  }
  
  ${props => {
    switch (props.$padding) {
      case 'none':
        return '';
      case 'sm':
        return `padding: ${theme.spacing.md};`;
      case 'lg':
        return `padding: ${theme.spacing.xl};`;
      default:
        return `padding: ${theme.spacing.lg};`;
    }
  }}
  
  ${props => {
    switch (props.$variant) {
      case 'outlined':
        return `
          border: 1px solid ${theme.colors.gray[200]};
          
          .dark & {
            border-color: ${theme.colors.gray[700]};
          }
        `;
      case 'elevated':
        return `
          box-shadow: ${theme.shadows.lg};
          border: 1px solid ${theme.colors.gray[100]};
          
          .dark & {
            border-color: ${theme.colors.gray[700]};
          }
        `;
      default:
        return `
          box-shadow: ${theme.shadows.sm};
          border: 1px solid ${theme.colors.gray[200]};
          
          .dark & {
            border-color: ${theme.colors.gray[700]};
          }
        `;
    }
  }}
  
  ${props => props.$hover && `
    cursor: pointer;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${theme.shadows.lg};
    }
  `}
`;

export function Card({
  children,
  className,
  padding = 'md',
  variant = 'default',
  hover = false,
  ...props
}: CardProps) {
  return (
    <StyledCard
      $padding={padding}
      $variant={variant}
      $hover={hover}
      className={className}
      {...props}
    >
      {children}
    </StyledCard>
  );
}