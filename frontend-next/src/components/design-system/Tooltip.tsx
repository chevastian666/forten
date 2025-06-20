"use client";

import styled from '@emotion/styled';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { theme } from '@/lib/theme';

const Container = styled.div`
  position: relative;
  display: inline-block;
`;

const TooltipContent = styled(motion.div)<{ position: string }>`
  position: absolute;
  z-index: 9999;
  padding: ${theme.spacing.xs} ${theme.spacing.sm};
  background: ${theme.colors.gray[900]};
  color: white;
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  white-space: nowrap;
  pointer-events: none;
  box-shadow: ${theme.shadows.lg};

  ${props => {
    switch (props.position) {
      case 'top':
        return `
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
        `;
      case 'bottom':
        return `
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 8px;
        `;
      case 'left':
        return `
          right: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-right: 8px;
        `;
      case 'right':
        return `
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 8px;
        `;
      default:
        return '';
    }
  }}

  &::after {
    content: '';
    position: absolute;
    border: 4px solid transparent;
    
    ${props => {
      switch (props.position) {
        case 'top':
          return `
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-top-color: ${theme.colors.gray[900]};
          `;
        case 'bottom':
          return `
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border-bottom-color: ${theme.colors.gray[900]};
          `;
        case 'left':
          return `
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-left-color: ${theme.colors.gray[900]};
          `;
        case 'right':
          return `
            right: 100%;
            top: 50%;
            transform: translateY(-50%);
            border-right-color: ${theme.colors.gray[900]};
          `;
        default:
          return '';
      }
    }}
  }
`;

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top',
  delay = 500
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Container
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <TooltipContent
            position={position}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
          >
            {content}
          </TooltipContent>
        )}
      </AnimatePresence>
    </Container>
  );
}