import React, { useEffect } from 'react';
import { CheckCircle2, Copy, Download, Sparkles, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'copy';
  title: string;
  message?: string;
  duration?: number;
}

interface ToastNotificationProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none no-print"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'copy':
        return <Copy className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />;
    }
  };

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-[#0B1530]/95 light:bg-white text-white light:text-slate-900 border border-amber-400/40 light:border-amber-500/30 shadow-2xl shadow-black/60 light:shadow-slate-300/60 backdrop-blur-md animate-fade-in transition-all transform hover:scale-[1.01]"
    >
      <div className="flex items-start gap-2.5">
        <div className="p-1.5 rounded-lg bg-emerald-500/15 light:bg-emerald-50 border border-emerald-500/30 light:border-emerald-200 mt-0.5">
          {getIcon()}
        </div>
        <div className="space-y-0.5 text-left">
          <p className="text-xs font-bold text-white light:text-slate-900 tracking-tight">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-[11px] text-slate-300 light:text-slate-600 leading-snug">
              {toast.message}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 p-1 rounded-md transition-colors cursor-pointer"
        title="Fermer la notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
