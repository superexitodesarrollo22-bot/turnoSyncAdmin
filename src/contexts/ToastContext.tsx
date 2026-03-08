import React, { createContext, useState, useCallback, useRef } from 'react';
import ToastUI from '../components/ui/Toast';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
    type: ToastType;
    message: string;
    duration?: number;
}

export interface ToastContextType {
    showToast: (config: ToastConfig) => void;
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => { } });

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = useState<ToastConfig | null>(null);
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const hideToast = useCallback(() => {
        setVisible(false);
    }, []);

    const showToast = useCallback((newConfig: ToastConfig) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setConfig(newConfig);
        setVisible(true);
        timerRef.current = setTimeout(() => {
            hideToast();
        }, newConfig.duration || 2800);
    }, [hideToast]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {config && <ToastUI config={config} visible={visible} onHide={hideToast} />}
        </ToastContext.Provider>
    );
}
