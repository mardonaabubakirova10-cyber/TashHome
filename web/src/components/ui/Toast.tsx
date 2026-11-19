import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Kind = 'success' | 'error' | 'info'
type Item = { id: number; kind: Kind; text: string }

const ToastContext = createContext<((text: string, kind?: Kind) => void) | null>(null)

const styles: Record<Kind, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-slate-800',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])

  const show = useCallback((text: string, kind: Kind = 'info') => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev, { id, kind, text }])
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4000)
  }, [])

  return (
    <ToastContext value={show}>
      {children}
      <div role="status" aria-live="polite" className="fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:items-end">
        {items.map((i) => (
          <div key={i.id} className={cn('max-w-sm rounded-lg px-4 py-2 text-sm text-white shadow-lg', styles[i.kind])}>
            {i.text}
          </div>
        ))}
      </div>
    </ToastContext>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast вне ToastProvider')
  return ctx
}
