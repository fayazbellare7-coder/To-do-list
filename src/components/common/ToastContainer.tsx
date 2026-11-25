import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, RotateCcw, X } from 'lucide-react';
import { useDayflow } from '../../context/DayflowContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useDayflow();

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-lg dark:border-zinc-800 dark:bg-[#1c1c21] dark:text-zinc-100"
          >
            {toast.tone === 'success' && (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            )}
            <span className="flex-1 truncate font-medium">{toast.message}</span>
            {toast.onUndo && (
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  dismissToast(toast.id);
                }}
                className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold df-accent-text hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <RotateCcw className="h-3 w-3" />
                {toast.undoLabel || 'Undo'}
              </button>
            )}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
