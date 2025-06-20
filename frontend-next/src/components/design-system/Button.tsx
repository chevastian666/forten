import React from 'react';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

const StyledButton = styled.button<{
  $variant: ButtonProps['variant'];
  $size: ButtonProps['size'];
  $loading: boolean;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  border: 1px solid transparent;
  border-radius: ${theme.borderRadius.md};
  font-weight: ${theme.typography.fontWeight.medium};
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  ${props => props.$fullWidth && `width: 100%;`}
  
  ${props => {
    switch (props.$size) {
      case 'sm':
        return `
          padding: ${theme.spacing.xs} ${theme.spacing.sm};
          font-size: ${theme.typography.fontSize.sm};
          height: 32px;
        `;
      case 'lg':
        return `
          padding: ${theme.spacing.md} ${theme.spacing.xl};
          font-size: ${theme.typography.fontSize.lg};
          height: 48px;
        `;
      default:
        return `
          padding: ${theme.spacing.sm} ${theme.spacing.md};
          font-size: ${theme.typography.fontSize.base};
          height: 40px;
        `;
    }
  }}
  
  ${props => {
    switch (props.$variant) {
      case 'primary':
        return `
          background: ${theme.colors.primary[500]};
          color: ${theme.colors.white};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.primary[600]};
          }
          
          &:focus:not(:disabled) {
            outline: none;
            box-shadow: 0 0 0 3px ${theme.colors.primary[100]};
          }
        `;
      case 'secondary':
        return `
          background: ${theme.colors.gray[100]};
          color: ${theme.colors.gray[700]};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.gray[200]};
          }
          
          &:focus:not(:disabled) {
            outline: none;
            box-shadow: 0 0 0 3px ${theme.colors.gray[100]};
          }
          
          .dark & {
            background: ${theme.colors.gray[800]};
            color: ${theme.colors.gray[200]};
            
            &:hover:not(:disabled) {
              background: ${theme.colors.gray[700]};
            }
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: ${theme.colors.primary[600]};
          border-color: ${theme.colors.primary[300]};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.primary[50]};
            border-color: ${theme.colors.primary[400]};
          }
          
          &:focus:not(:disabled) {
            outline: none;
            box-shadow: 0 0 0 3px ${theme.colors.primary[100]};
          }
          
          .dark & {
            color: ${theme.colors.primary[400]};
            border-color: ${theme.colors.primary[600]};
            
            &:hover:not(:disabled) {
              background: ${theme.colors.primary[900]};
            }
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${theme.colors.gray[700]};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.gray[100]};
          }
          
          &:focus:not(:disabled) {
            outline: none;
            box-shadow: 0 0 0 3px ${theme.colors.gray[100]};
          }
          
          .dark & {
            color: ${theme.colors.gray[300]};
            
            &:hover:not(:disabled) {
              background: ${theme.colors.gray[800]};
            }
          }
        `;
      case 'danger':
        return `
          background: ${theme.colors.red[500]};
          color: ${theme.colors.white};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.red[600]};
          }
          
          &:focus:not(:disabled) {
            outline: none;
            box-shadow: 0 0 0 3px ${theme.colors.red[100]};
          }
        `;
      default:
        return `
          background: ${theme.colors.primary[500]};
          color: ${theme.colors.white};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.primary[600]};
          }
          
          &:focus:not(:disabled) {
            outline: none;
            box-shadow: 0 0 0 3px ${theme.colors.primary[100]};
          }
        `;
    }
  }}
`;

const Spinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <StyledButton
      $variant={variant}
      $size={size}
      $loading={loading}
      $fullWidth={fullWidth}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {!loading && leftIcon && leftIcon}
      {children}
      {!loading && rightIcon && rightIcon}
    </StyledButton>
  );
}