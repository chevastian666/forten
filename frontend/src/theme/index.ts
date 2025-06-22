import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FF6B35', // Hikvision Orange
      light: '#FF8F65',
      dark: '#E85D25',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#3C4043', // Professional Dark Surface
      light: '#5F6368',
      dark: '#1A1A1A',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#F28B82',
      light: '#F6AEA9',
      dark: '#D93025',
    },
    warning: {
      main: '#FDD663',
      light: '#FEEFC3',
      dark: '#F9AB00',
    },
    success: {
      main: '#81C995',
      light: '#B8E6C1',
      dark: '#34A853',
    },
    info: {
      main: '#8AB4F8',
      light: '#AECBFA',
      dark: '#1A73E8',
    },
    background: {
      default: '#0F1419', // Deep dark blue-gray (Hikvision style)
      paper: '#1E2328', // Card/panel background
    },
    text: {
      primary: '#E8EAED',
      secondary: '#9AA0A6',
    },
    divider: 'rgba(154, 160, 166, 0.24)',
    action: {
      active: '#FF6B35',
      hover: 'rgba(255, 107, 53, 0.08)',
      selected: 'rgba(255, 107, 53, 0.16)',
      disabled: 'rgba(232, 234, 237, 0.3)',
      disabledBackground: 'rgba(232, 234, 237, 0.12)',
    },
  },
  typography: {
    fontFamily: '"SF Pro Display", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      color: '#E8EAED',
      lineHeight: 1.2,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      color: '#E8EAED',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      color: '#E8EAED',
      lineHeight: 1.3,
      letterSpacing: '-0.015em',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
      color: '#E8EAED',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
      color: '#E8EAED',
      lineHeight: 1.4,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 500,
      color: '#E8EAED',
      lineHeight: 1.4,
      letterSpacing: '-0.005em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#E8EAED',
      letterSpacing: '-0.003em',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      color: '#9AA0A6',
      letterSpacing: '-0.003em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
      fontSize: '0.875rem',
      letterSpacing: '0.0178em',
    },
    caption: {
      fontSize: '0.75rem',
      color: '#9AA0A6',
      letterSpacing: '0.0333em',
    },
    overline: {
      fontSize: '0.625rem',
      fontWeight: 600,
      color: '#9AA0A6',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0F1419',
          fontFamily: '"SF Pro Display", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
          color: '#E8EAED',
        },
        '*::-webkit-scrollbar': {
          width: '8px',
          height: '8px',
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: '#1E2328',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: '#3C4043',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: '#5F6368',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          fontWeight: 500,
          padding: '10px 20px',
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          letterSpacing: '0.0178em',
        },
        containedPrimary: {
          backgroundColor: '#FF6B35',
          color: '#FFFFFF',
          border: '1px solid #FF6B35',
          '&:hover': {
            backgroundColor: '#E85D25',
            borderColor: '#E85D25',
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.4)',
          },
        },
        outlinedPrimary: {
          borderColor: '#FF6B35',
          color: '#FF6B35',
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: '#E85D25',
            backgroundColor: 'rgba(255, 107, 53, 0.08)',
            color: '#E85D25',
          },
        },
        textPrimary: {
          color: '#FF6B35',
          '&:hover': {
            backgroundColor: 'rgba(255, 107, 53, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E2328',
          border: '1px solid #3C4043',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'rgba(255, 107, 53, 0.3)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 107, 53, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E2328',
          borderRadius: 8,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(154, 160, 166, 0.12)',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
        },
        elevation2: {
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
        },
        elevation3: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(154, 160, 166, 0.24)',
          fontSize: '0.875rem',
          padding: '16px',
          color: '#E8EAED',
        },
        head: {
          fontWeight: 600,
          fontSize: '0.875rem',
          backgroundColor: '#0F1419',
          color: '#E8EAED',
          borderBottom: '2px solid rgba(154, 160, 166, 0.24)',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(255, 107, 53, 0.08)',
          },
          '&:nth-of-type(even)': {
            backgroundColor: 'rgba(154, 160, 166, 0.05)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: '#1E2328',
            borderRadius: 6,
            color: '#E8EAED',
            '& fieldset': {
              borderColor: '#3C4043',
            },
            '&:hover fieldset': {
              borderColor: '#5F6368',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#FF6B35',
              boxShadow: '0 0 0 2px rgba(255, 107, 53, 0.2)',
            },
          },
          '& .MuiInputLabel-root': {
            color: '#9AA0A6',
            '&.Mui-focused': {
              color: '#FF6B35',
            },
          },
          '& .MuiOutlinedInput-input': {
            color: '#E8EAED',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E2328',
          color: '#E8EAED',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid #3C4043',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E2328',
          color: '#E8EAED',
          borderRight: '1px solid #3C4043',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '4px 8px',
          color: '#E8EAED',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: 'rgba(255, 107, 53, 0.12)',
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            backgroundColor: '#FF6B35',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(255, 107, 53, 0.3)',
            '&:hover': {
              backgroundColor: '#E85D25',
              transform: 'translateX(4px)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
          letterSpacing: '0.0178em',
        },
        colorPrimary: {
          backgroundColor: '#FF6B35',
          color: '#FFFFFF',
          border: '1px solid #FF6B35',
        },
        colorSecondary: {
          backgroundColor: '#3C4043',
          color: '#E8EAED',
          border: '1px solid #5F6368',
        },
        outlined: {
          borderColor: '#5F6368',
          color: '#E8EAED',
          backgroundColor: 'transparent',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          border: '1px solid',
        },
        standardSuccess: {
          backgroundColor: 'rgba(129, 201, 149, 0.1)',
          color: '#81C995',
          borderColor: 'rgba(129, 201, 149, 0.3)',
        },
        standardError: {
          backgroundColor: 'rgba(242, 139, 130, 0.1)',
          color: '#F28B82',
          borderColor: 'rgba(242, 139, 130, 0.3)',
        },
        standardWarning: {
          backgroundColor: 'rgba(253, 214, 99, 0.1)',
          color: '#FDD663',
          borderColor: 'rgba(253, 214, 99, 0.3)',
        },
        standardInfo: {
          backgroundColor: 'rgba(138, 180, 248, 0.1)',
          color: '#8AB4F8',
          borderColor: 'rgba(138, 180, 248, 0.3)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          color: '#9AA0A6',
          '&:hover': {
            backgroundColor: 'rgba(255, 107, 53, 0.08)',
            color: '#FF6B35',
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 6,
          borderRadius: 3,
          backgroundColor: '#3C4043',
        },
        barColorPrimary: {
          backgroundColor: '#FF6B35',
          boxShadow: '0 0 4px rgba(255, 107, 53, 0.4)',
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        colorPrimary: {
          color: '#FF6B35',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: '#FF6B35',
          color: '#FFFFFF',
          fontWeight: 600,
          fontSize: '0.75rem',
          minWidth: '20px',
          height: '20px',
          border: '2px solid #1E2328',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FF6B35',
          color: '#FFFFFF',
          fontWeight: 600,
        },
        colorDefault: {
          backgroundColor: '#3C4043',
          color: '#E8EAED',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(154, 160, 166, 0.24)',
        },
      },
    },
  },
});

export default theme;