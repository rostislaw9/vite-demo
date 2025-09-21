import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { ThemeProvider } from './components/ThemeProvider';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import AppRoutes from './routes/AppRoutes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <PreferencesProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
