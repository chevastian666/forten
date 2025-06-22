import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { theme } from '@/styles/theme';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
}

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: ${theme.spacing.md};
  opacity: ${props => props.$isOpen ? 1 : 0};
  visibility: ${props => props.$isOpen ? 'visible' : 'hidden'};
  transition: all 0.2s ease-in-out;
`;

const ModalContainer = styled.div<{ 
  $isOpen: boolean; 
  $size: ModalProps['size']; 
}>`
  background: ${theme.colors.white};
  border-radius: ${theme.borderRadius.lg};
  box-shadow: ${theme.shadows['2xl']};
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  transform: ${props => props.$isOpen ? 'scale(1)' : 'scale(0.95)'};
  transition: transform 0.2s ease-in-out;
  
  .dark & {
    background: ${theme.colors.gray[800]};
  }
  
  ${props => {
    switch (props.$size) {
      case 'sm':
        return `max-width: 400px;`;
      case 'lg':
        return `max-width: 800px;`;
      case 'xl':
        return `max-width: 1200px;`;
      default:
        return `max-width: 600px;`;
    }
  }}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  padding: ${theme.spacing.lg} ${theme.spacing.lg} 0;
  border-bottom: 1px solid ${theme.colors.gray[200]};
  margin-bottom: ${theme.spacing.lg};
  
  .dark & {
    border-color: ${theme.colors.gray[700]};
  }
`;

const Title = styled.h2`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.gray[900]};
  margin: 0;
  flex: 1;
  
  .dark & {
    color: ${theme.colors.white};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: ${theme.spacing.xs};
  cursor: pointer;
  color: ${theme.colors.gray[400]};
  border-radius: ${theme.borderRadius.md};
  transition: all 0.2s ease-in-out;
  
  &:hover {
    background: ${theme.colors.gray[100]};
    color: ${theme.colors.gray[600]};
  }
  
  .dark & {
    color: ${theme.colors.gray[500]};
    
    &:hover {
      background: ${theme.colors.gray[700]};
      color: ${theme.colors.gray[300]};
    }
  }
`;

const Content = styled.div`
  padding: 0 ${theme.spacing.lg} ${theme.spacing.lg};
`;

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
}: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);
  
  const handleOverlayClick = () => {
    if (closeOnOverlayClick) {
      onClose();
    }
  };
  
  return (
    <Overlay 
      $isOpen={isOpen} 
      onClick={handleOverlayClick}
    >
      <ModalContainer
        $isOpen={isOpen}
        $size={size}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <Header>
            {title && <Title>{title}</Title>}
            {showCloseButton && (
              <CloseButton onClick={onClose}>
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </CloseButton>
            )}
          </Header>
        )}
        <Content>
          {children}
        </Content>
      </ModalContainer>
    </Overlay>
  );
}