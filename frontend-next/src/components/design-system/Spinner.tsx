"use client";

import styled from '@emotion/styled';
import { theme } from '@/lib/theme';

const SpinnerContainer = styled.div<{ size: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${props => {
    switch (props.size) {
      case 'sm': return '16px';
      case 'md': return '24px';
      case 'lg': return '32px';
      case 'xl': return '48px';
      default: return '24px';
    }
  }};
  height: ${props => {
    switch (props.size) {
      case 'sm': return '16px';
      case 'md': return '24px';
      case 'lg': return '32px';
      case 'xl': return '48px';
      default: return '24px';
    }
  }};
`;

const SpinnerSvg = styled.svg`
  animation: rotate 1s linear infinite;
  width: 100%;
  height: 100%;

  @keyframes rotate {
    100% {
      transform: rotate(360deg);
    }
  }
`;

const SpinnerPath = styled.circle<{ variant: string }>`
  stroke: ${props => {
    switch (props.variant) {
      case 'primary': return theme.colors.primary[600];
      case 'white': return 'white';
      case 'gray': return theme.colors.gray[400];
      default: return theme.colors.primary[600];
    }
  }};
  stroke-linecap: round;
  animation: dash 1.5s ease-in-out infinite;

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }
`;

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'white' | 'gray';
}

export function Spinner({ size = 'md', variant = 'primary' }: SpinnerProps) {
  return (
    <SpinnerContainer size={size}>
      <SpinnerSvg viewBox="0 0 50 50">
        <SpinnerPath
          variant={variant}
          cx="25"
          cy="25"
          r="20"
          fill="none"
          strokeWidth="3"
        />
      </SpinnerSvg>
    </SpinnerContainer>
  );
}