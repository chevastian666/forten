import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '@mui/material/styles';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();

  return (
    <>
      {children}
      <Toaster
        containerStyle={{
          position: 'fixed',
          top: '80px',
          right: '24px',
          zIndex: 9999,
        }}
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 3000,
          style: {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: theme.typography.fontFamily,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            padding: '12px 16px',
            width: '100%',
            maxWidth: '100%',
            pointerEvents: 'auto',
          },
          success: {
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
          error: {
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
          loading: {
            style: {
              background: 'rgba(255, 107, 53, 0.1)',
              color: '#FF6B35',
              border: '1px solid rgba(255, 107, 53, 0.3)',
            },
          },
        }}
      />
    </>
  );
};