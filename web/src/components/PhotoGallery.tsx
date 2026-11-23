import { useState } from 'react'
import { cn } from '../lib/cn'

export default function PhotoGallery({ photos }: { photos: string[] }) {
  const [active, setActive] = useState(0)
  return (
    <div className="grid gap-2">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
        <img src={photos[active]} alt="" className="size-full object-cover" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Фото ${i + 1}`}
            aria-pressed={i === active}
            className={cn(
              'aspect-[4/3] overflow-hidden rounded-lg bg-slate-200 outline-offset-2',
              i === active ? 'outline-2 outline-white' : 'opacity-80 hover:opacity-100',
            )}
          >
            <img src={src} alt="" loading="lazy" className="size-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  )
}
