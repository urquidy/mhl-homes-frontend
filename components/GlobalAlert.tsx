import React, { useEffect } from 'react';
import { registerGlobalAlert } from '../services/api';
import { useCustomAlert, AlertButton } from './ui/CustomAlert';

// Adaptamos la firma para que coincida con la de registerGlobalAlert
const alertCallback = (
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void
) => (title: string, message: string) => {
  showAlert(title, message, [{ text: 'OK' }]);
};

const GlobalAlert = () => {
  const { showAlert, AlertComponent } = useCustomAlert();

  useEffect(() => {
    // Registra la función de alerta global cuando el componente se monta
    const unregister = registerGlobalAlert(alertCallback(showAlert));

    // Limpia el registro cuando el componente se desmonta
    return () => {
      unregister();
    };
  }, [showAlert]);

  return <AlertComponent />;
};

export default GlobalAlert;
