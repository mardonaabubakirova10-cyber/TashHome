import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export default function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-slate-200 bg-slate-100', className)} {...rest} />
}
