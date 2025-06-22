import React, { useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { useTheme } from '@mui/material/styles';
import { Box } from '@mui/material';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Force react-hot-toast to use our container
    const fixPositioning = () => {
      const toasterDiv = document.querySelector('div[style*="z-index: 9999"]');
      if (toasterDiv && containerRef.current) {
        containerRef.current.appendChild(toasterDiv);
      }
    };

    // Try multiple times to catch the toaster after it's created
    const timers = [
      setTimeout(fixPositioning, 0),
      setTimeout(fixPositioning, 100),
      setTimeout(fixPositioning, 500),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      {children}
      <Box
        ref={containerRef}
        sx={{
          position: 'fixed',
          top: { xs: '70px', sm: '80px' },
          right: { xs: '16px', sm: '24px' },
          zIndex: 9999,
          width: { xs: 'calc(100vw - 32px)', sm: '360px' },
          maxWidth: '360px',
          pointerEvents: 'none',
          '& > div': {
            position: 'relative !important',
            inset: 'unset !important',
            width: '100% !important',
            '& > div': {
              width: '100% !important',
              '& > div[role="status"]': {
                width: '100% !important',
                maxWidth: '100% !important',
                marginRight: '0 !important',
              }
            }
          }
        }}
      />
      <Toaster
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