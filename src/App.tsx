import React from 'react';
import { BrowserRouter } from 'react-router-dom';

import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster richColors position="bottom-right" />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
