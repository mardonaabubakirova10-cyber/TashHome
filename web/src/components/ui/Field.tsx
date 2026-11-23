import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const control =
  'w-full rounded-lg border bg-slate-100 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-white disabled:bg-slate-100'

function Wrapper({ id, label, error, children }: { id: string; label?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

type Common = { label?: string; error?: string }

export function Input({ label, error, className, id, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Wrapper id={fid} label={label} error={error}>
      <input
        id={fid}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-error` : undefined}
        className={cn(control, error ? 'border-red-500' : 'border-slate-300', className)}
        {...rest}
      />
    </Wrapper>
  )
}

export function Select({ label, error, className, id, children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Wrapper id={fid} label={label} error={error}>
      <select
        id={fid}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-error` : undefined}
        className={cn(control, error ? 'border-red-500' : 'border-slate-300', className)}
        {...rest}
      >
        {children}
      </select>
    </Wrapper>
  )
}

export function Textarea({ label, error, className, id, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <Wrapper id={fid} label={label} error={error}>
      <textarea
        id={fid}
        rows={4}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${fid}-error` : undefined}
        className={cn(control, error ? 'border-red-500' : 'border-slate-300', className)}
        {...rest}
      />
    </Wrapper>
  )
}
