import { useEffect, useRef, type ReactNode } from 'react'

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode }

export default function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-auto w-[min(92vw,32rem)] rounded-xl bg-slate-100 p-0 text-slate-900 shadow-xl backdrop:bg-black/70"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-200"
        >
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}
