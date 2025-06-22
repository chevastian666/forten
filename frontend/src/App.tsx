import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { store } from './store';
import theme from './theme';
import { MainLayout } from './components/Layout/MainLayout';
import { PrivateRoute } from './components/PrivateRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Buildings } from './pages/Buildings';
import { Events } from './pages/Events';
import { AccessControl } from './pages/AccessControl';
import { Monitoring } from './pages/Monitoring';
import { ExecutiveDashboard } from './pages/Dashboard/ExecutiveDashboard';
import { Building3DMap } from './components/Map';
import { CommandCenter } from './pages/CommandCenter';
import { AIAlertSystem } from './components/Alerts';
import { PageTransition } from './components/Animations';
import { ToastProvider } from './components/Notifications';
import { useAppSelector } from './hooks/useAppSelector';
import { useAppDispatch } from './hooks/useAppDispatch';
import { fetchProfile } from './store/authSlice';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { accessToken, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (accessToken && !isAuthenticated) {
      dispatch(fetchProfile());
    }
  }, [dispatch, accessToken, isAuthenticated]);

  return (
    <PageTransition>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Executive Dashboard - Fullscreen route */}
        <Route 
          path="/executive" 
          element={
            <PrivateRoute roles={['admin', 'manager']}>
              <ExecutiveDashboard />
            </PrivateRoute>
          } 
        />
        
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="buildings" element={<Buildings />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="events" element={<Events />} />
          <Route path="access" element={<AccessControl />} />
          <Route 
            path="map3d" 
            element={
              <PrivateRoute roles={['admin', 'manager']}>
                <Building3DMap />
              </PrivateRoute>
            } 
          />
          <Route 
            path="command-center" 
            element={
              <PrivateRoute roles={['admin', 'manager']}>
                <CommandCenter />
              </PrivateRoute>
            } 
          />
          <Route 
            path="ai-alerts" 
            element={
              <PrivateRoute roles={['admin', 'manager', 'supervisor']}>
                <AIAlertSystem />
              </PrivateRoute>
            } 
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  );
};

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </Router>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
