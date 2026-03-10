import React, { useEffect } from 'react';
import { ExclamationTriangleIcon } from '@/components/ui/IconComponents';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
}

interface ToastContainerProps {
  notifications: ToastNotification[];
  removeNotification: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

interface ToastProps {
  notification: ToastNotification;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto close after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = 
    notification.type === 'error' ? 'bg-red-500' :
    notification.type === 'warning' ? 'bg-yellow-500' :
    'bg-blue-500';

  return (
    <div className={`${bgColor} text-white px-4 py-3 rounded shadow-lg flex items-center justify-between min-w-[300px] animate-fade-in-up`}>
      <div className="flex items-center">
        {notification.type === 'warning' && <ExclamationTriangleIcon className="w-5 h-5 mr-2" />}
        <p className="text-sm font-medium">{notification.message}</p>
      </div>
      <button onClick={onClose} className="ml-4 text-white hover:text-gray-200 focus:outline-none">
        &times;
      </button>
    </div>
  );
};
