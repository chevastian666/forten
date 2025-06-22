import React, { useState, useRef, useEffect } from 'react';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  fullWidth?: boolean;
}

const Container = styled.div<{ $fullWidth: boolean }>`
  position: relative;
  ${props => props.$fullWidth && 'width: 100%;'}
`;

const Trigger = styled.button<{ 
  $isOpen: boolean; 
  $hasError: boolean; 
  $fullWidth: boolean; 
}>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: ${props => props.$fullWidth ? '100%' : 'auto'};
  min-width: 200px;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  border: 1px solid ${props => props.$hasError ? theme.colors.red[300] : theme.colors.gray[300]};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.white};
  font-size: ${theme.typography.fontSize.base};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
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
  }
`;

const TriggerText = styled.span<{ $isPlaceholder: boolean }>`
  color: ${props => props.$isPlaceholder ? theme.colors.gray[400] : 'inherit'};
  
  .dark & {
    color: ${props => props.$isPlaceholder ? theme.colors.gray[500] : 'inherit'};
  }
`;

const ChevronIcon = styled.svg<{ $isOpen: boolean }>`
  width: 20px;
  height: 20px;
  color: ${theme.colors.gray[400]};
  transition: transform 0.2s ease-in-out;
  transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  
  .dark & {
    color: ${theme.colors.gray[500]};
  }
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  margin-top: ${theme.spacing.xs};
  background: ${theme.colors.white};
  border: 1px solid ${theme.colors.gray[200]};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.lg};
  max-height: 200px;
  overflow-y: auto;
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.$isOpen ? 'translateY(0)' : 'translateY(-8px)'};
  transition: all 0.2s ease-in-out;
  
  .dark & {
    background: ${theme.colors.gray[800]};
    border-color: ${theme.colors.gray[700]};
  }
`;

const DropdownOption = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  text-align: left;
  border: none;
  background: ${props => props.$isSelected ? theme.colors.primary[50] : 'transparent'};
  color: ${props => props.$isSelected ? theme.colors.primary[600] : theme.colors.gray[700]};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    background: ${theme.colors.gray[50]};
  }
  
  &:disabled {
    color: ${theme.colors.gray[400]};
    cursor: not-allowed;
    
    &:hover {
      background: transparent;
    }
  }
  
  .dark & {
    background: ${props => props.$isSelected ? theme.colors.primary[900] : 'transparent'};
    color: ${props => props.$isSelected ? theme.colors.primary[300] : theme.colors.gray[300]};
    
    &:hover {
      background: ${theme.colors.gray[700]};
    }
    
    &:disabled {
      color: ${theme.colors.gray[600]};
      
      &:hover {
        background: transparent;
      }
    }
  }
`;

export function Dropdown({
  options,
  value,
  placeholder = 'Seleccionar...',
  onChange,
  disabled = false,
  error = false,
  fullWidth = true,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(option => option.value === value);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };
  
  return (
    <Container ref={containerRef} $fullWidth={fullWidth}>
      <Trigger
        onClick={handleToggle}
        disabled={disabled}
        $isOpen={isOpen}
        $hasError={error}
        $fullWidth={fullWidth}
      >
        <TriggerText $isPlaceholder={!selectedOption}>
          {selectedOption ? selectedOption.label : placeholder}
        </TriggerText>
        <ChevronIcon $isOpen={isOpen} viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </ChevronIcon>
      </Trigger>
      
      <DropdownMenu $isOpen={isOpen}>
        {options.map((option) => (
          <DropdownOption
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={option.disabled}
            $isSelected={option.value === value}
          >
            {option.label}
          </DropdownOption>
        ))}
      </DropdownMenu>
    </Container>
  );
}