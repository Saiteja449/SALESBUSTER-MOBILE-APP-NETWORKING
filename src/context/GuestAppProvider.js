import React from 'react';
import { ToastProvider } from './ToastContext';
import { AuthProvider } from './AuthContext';
import ToastComponent from '../components/common/ToastComponent';

const GuestAppProvider = ({ children }) => (
  <ToastProvider>
    <AuthProvider>
      {children}
      <ToastComponent />
    </AuthProvider>
  </ToastProvider>
);

export default GuestAppProvider;
