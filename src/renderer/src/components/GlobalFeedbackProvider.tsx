import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Trash2, Loader2 } from 'lucide-react'
import { useFeedbackStore, FeedbackType } from '../stores/feedbackStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'

const TOAST_ICONS: Record<FeedbackType, React.FC<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info
}

const TOAST_STYLES: Record<FeedbackType, { border: string; bg: string; text: string; iconColor: string }> = {
  success: {
    border: 'border-emerald-500/30',
    bg: 'bg-card/95 dark:bg-card/90 shadow-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60'
  },
  error: {
    border: 'border-rose-500/30',
    bg: 'bg-card/95 dark:bg-card/90 shadow-rose-500/10',
    text: 'text-rose-700 dark:text-rose-300',
    iconColor: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60'
  },
  warning: {
    border: 'border-amber-500/30',
    bg: 'bg-card/95 dark:bg-card/90 shadow-amber-500/10',
    text: 'text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60'
  },
  info: {
    border: 'border-sky-500/30',
    bg: 'bg-card/95 dark:bg-card/90 shadow-sky-500/10',
    text: 'text-sky-700 dark:text-sky-300',
    iconColor: 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-950/60'
  }
}

export function GlobalFeedbackProvider() {
  const {
    toasts,
    removeToast,
    modalConfig,
    hideModal,
    confirmConfig,
    hideConfirm,
    setConfirmLoading
  } = useFeedbackStore()

  async function handleConfirmSubmit() {
    if (!confirmConfig) return
    try {
      setConfirmLoading(true)
      await confirmConfig.onConfirm()
      hideConfirm()
    } catch (err) {
      console.error('Erreur lors de la confirmation:', err)
      setConfirmLoading(false)
    }
  }

  return (
    <>
      {/* ── TOAST NOTIFICATIONS CONTAINER (BOTTOM-RIGHT) ───────────────── */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.type]
          const style = TOAST_STYLES[toast.type]

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border ${style.border} ${style.bg} shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0 pt-0.5">
                {toast.title && (
                  <p className="font-semibold text-xs leading-tight mb-0.5 text-foreground">{toast.title}</p>
                )}
                <p className="text-xs text-muted-foreground leading-snug">{toast.message}</p>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-1 text-muted-foreground/60 hover:text-foreground rounded-md transition-colors"
                title="Fermer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* ── GLOBAL CONFIRMATION DIALOG (FOR DELETIONS / SENSITIVE ACTIONS) ── */}
      <Dialog
        open={confirmConfig?.open ?? false}
        onOpenChange={(open) => {
          if (!open && !confirmConfig?.loading) {
            confirmConfig?.onCancel?.()
            hideConfirm()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                confirmConfig?.variant === 'destructive'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
              }`}>
                {confirmConfig?.variant === 'destructive' ? (
                  <Trash2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                {confirmConfig?.title || 'Confirmation requise'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {confirmConfig?.message}
            </p>

            {confirmConfig?.itemName && (
              <div className="rounded-lg bg-muted/60 p-2.5 text-xs font-semibold text-foreground border">
                « {confirmConfig.itemName} »
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                confirmConfig?.onCancel?.()
                hideConfirm()
              }}
              disabled={confirmConfig?.loading}
              className="text-xs"
            >
              {confirmConfig?.cancelLabel || 'Annuler'}
            </Button>
            <Button
              variant={confirmConfig?.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirmSubmit}
              disabled={confirmConfig?.loading}
              className="text-xs font-semibold gap-1.5"
            >
              {confirmConfig?.loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {confirmConfig?.confirmLabel || 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── GLOBAL FEEDBACK MODAL (FOR PROMINENT SUCCESS / ERROR RESULTS) ──── */}
      <Dialog
        open={modalConfig?.open ?? false}
        onOpenChange={(open) => {
          if (!open) hideModal()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-4">
            <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
              modalConfig?.type === 'success'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
            }`}>
              {modalConfig?.type === 'success' ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <AlertCircle className="h-8 w-8" />
              )}
            </div>

            <DialogTitle className="text-lg font-bold text-foreground mb-1">
              {modalConfig?.title || 'Notification'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {modalConfig?.message}
            </p>

            {modalConfig?.details && (
              <div className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground border mb-4 text-left">
                {modalConfig.details}
              </div>
            )}

            <div className="flex gap-2 justify-center mt-4">
              {modalConfig?.secondaryActionLabel && (
                <Button
                  variant="outline"
                  onClick={() => {
                    modalConfig.onSecondaryAction?.()
                    hideModal()
                  }}
                  className="flex-1 text-xs"
                >
                  {modalConfig.secondaryActionLabel}
                </Button>
              )}
              <Button
                onClick={() => {
                  modalConfig?.onPrimaryAction?.()
                  hideModal()
                }}
                className={`flex-1 text-xs font-semibold ${
                  modalConfig?.type === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {modalConfig?.primaryActionLabel || 'OK'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
