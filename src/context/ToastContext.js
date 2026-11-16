import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';

const ToastStateContext = createContext(null);
const ToastActionsContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message, type });
    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
      timerRef.current = null;
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const actions = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastStateContext.Provider value={toast}>
        {children}
      </ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
};

export const useToastState = () => {
  const context = useContext(ToastStateContext);
  if (!context) throw new Error('useToastState must be used within ToastProvider');
  return context;
};

export const useToastActions = () => {
  const context = useContext(ToastActionsContext);
  if (!context) throw new Error('useToastActions must be used within ToastProvider');
  return context;
};

export const useToast = () => {
  return useToastActions();
};

export default ToastActionsContext;
