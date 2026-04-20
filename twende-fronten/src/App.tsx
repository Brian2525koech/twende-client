// src/App.tsx
import React from 'react';
import AppRoutes from '@/routes/AppRoutes';

const App: React.FC = () => {
  return (
    // No <BrowserRouter> here because it's already in main.tsx
    <AppRoutes />
  );
};

export default App;