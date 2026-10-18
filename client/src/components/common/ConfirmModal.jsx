import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div 
        role="dialog" 
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="bg-white rounded-3xl border border-cream-200 shadow-2xl max-w-md w-full p-6 space-y-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDestructive ? 'bg-rose-100 text-rose-700' : 'bg-forest-100 text-forest-800'
              }`}
            >
              {isDestructive ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <h3 id="confirm-title" className="text-base font-bold text-earth-950">
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed pl-13">
          {message}
        </p>

        <div className="pt-2 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 hover:bg-cream-100 border border-cream-200 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-forest-800 hover:bg-forest-900'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
