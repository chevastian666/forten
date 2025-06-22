import React from 'react';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Container = styled.div<{ $fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  ${props => props.$fullWidth && 'width: 100%;'}
`;

const Label = styled.label`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.gray[700]};
  
  .dark & {
    color: ${theme.colors.gray[300]};
  }
`;

const InputWrapper = styled.div<{ $hasError: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input<{ 
  $hasError: boolean; 
  $hasLeftIcon: boolean; 
  $hasRightIcon: boolean; 
}>`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${props => props.$hasError ? theme.colors.red[300] : theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.base};
  background: ${theme.colors.white};
  transition: all 0.2s ease-in-out;
  
  ${props => props.$hasLeftIcon && `padding-left: ${theme.spacing['2xl']};`}
  ${props => props.$hasRightIcon && `padding-right: ${theme.spacing['2xl']};`}
  
  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? theme.colors.red[500] : theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? theme.colors.red[100] : theme.colors.primary[100]};
  }
  
  &:disabled {
    background: ${theme.colors.gray[100]};
    color: ${theme.colors.gray[500]};
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: ${theme.colors.gray[400]};
  }
  
  .dark & {
    background: ${theme.colors.gray[700]};
    border-color: ${props => props.$hasError ? theme.colors.red[600] : theme.colors.gray[600]};
    color: ${theme.colors.white};
    
    &:focus {
      border-color: ${props => props.$hasError ? theme.colors.red[400] : theme.colors.primary[400]};
      box-shadow: 0 0 0 3px ${props => props.$hasError ? theme.colors.red[900] : theme.colors.primary[900]};
    }
    
    &:disabled {
      background: ${theme.colors.gray[800]};
      color: ${theme.colors.gray[500]};
    }
    
    &::placeholder {
      color: ${theme.colors.gray[500]};
    }
  }
`;

const IconContainer = styled.div<{ position: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.position}: ${theme.spacing.md};
  color: ${theme.colors.gray[400]};
  display: flex;
  align-items: center;
  pointer-events: none;
  
  .dark & {
    color: ${theme.colors.gray[500]};
  }
`;

const HelperText = styled.span<{ $isError: boolean }>`
  font-size: ${theme.typography.fontSize.sm};
  color: ${props => props.$isError ? theme.colors.red[600] : theme.colors.gray[600]};
  
  .dark & {
    color: ${props => props.$isError ? theme.colors.red[400] : theme.colors.gray[400]};
  }
`;

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className,
  ...props
}: InputProps) {
  return (
    <Container $fullWidth={fullWidth} className={className}>
      {label && <Label>{label}</Label>}
      <InputWrapper $hasError={!!error}>
        {leftIcon && (
          <IconContainer position="left">
            {leftIcon}
          </IconContainer>
        )}
        <StyledInput
          $hasError={!!error}
          $hasLeftIcon={!!leftIcon}
          $hasRightIcon={!!rightIcon}
          {...props}
        />
        {rightIcon && (
          <IconContainer position="right">
            {rightIcon}
          </IconContainer>
        )}
      </InputWrapper>
      {(error || helperText) && (
        <HelperText $isError={!!error}>
          {error || helperText}
        </HelperText>
      )}
    </Container>
  );
}