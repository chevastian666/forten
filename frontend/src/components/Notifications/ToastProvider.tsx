import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '@mui/material/styles';
import './ToastProvider.css';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 9999,
    pointerEvents: 'none',
  };

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={12}
        containerClassName="toast-container"
        containerStyle={containerStyle}
        toastOptions={{
          // Ensure proper stacking and prevent overlap
          className: 'toast-item',
          // Default options for all toasts
          duration: 3000, // Reduced duration to prevent accumulation
          style: {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: theme.typography.fontFamily,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(8px)',
            maxWidth: '380px',
            minWidth: '300px',
            padding: '12px 16px',
            pointerEvents: 'auto',
          },
          // Success notifications
          success: {
            duration: 3000,
            style: {
              background: 'rgba(129, 201, 149, 0.1)',
              color: '#81C995',
              border: '1px solid rgba(129, 201, 149, 0.3)',
            },
            iconTheme: {
              primary: '#81C995',
              secondary: 'rgba(129, 201, 149, 0.1)',
            },
          },
          // Error notifications
          error: {
            duration: 5000,
            style: {
              background: 'rgba(242, 139, 130, 0.1)',
              color: '#F28B82',
              border: '1px solid rgba(242, 139, 130, 0.3)',
            },
            iconTheme: {
              primary: '#F28B82',
              secondary: 'rgba(242, 139, 130, 0.1)',
            },
          },
          // Loading notifications
          loading: {
            style: {
              background: 'rgba(255, 107, 53, 0.1)',
              color: '#FF6B35',
              border: '1px solid rgba(255, 107, 53, 0.3)',
            },
          },
          // Custom alert notifications
          custom: {
            style: {
              background: 'rgba(138, 180, 248, 0.1)',
              color: '#8AB4F8',
              border: '1px solid rgba(138, 180, 248, 0.3)',
            },
          },
        }}
      />
    </>
  );
};