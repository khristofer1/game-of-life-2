// src/hooks/useToast.ts
import { useState, useRef, useCallback } from 'react';

// Exporting these types makes our code super strictly typed!
export type ToastAction = 'delete' | 'complete' | 'restore' | 'break';

export interface ToastState {
	id: number;
	message: string;
	action: ToastAction;
	taskId: number;
}

export const useToast = () => {
	const [toast, setToast] = useState<ToastState | null>(null);
	const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	// useCallback ensures this function doesn't get recreated on every render
	const triggerToast = useCallback((message: string, action: ToastAction, taskId: number) => {
		if (toastTimeout.current) clearTimeout(toastTimeout.current);
		setToast({ id: Date.now(), message, action, taskId });
		
		toastTimeout.current = setTimeout(() => setToast(null), 5000);
	}, []);

	const closeToast = useCallback(() => {
		if (toastTimeout.current) clearTimeout(toastTimeout.current);
		setToast(null);
	}, []);

	return { toast, triggerToast, closeToast };
};