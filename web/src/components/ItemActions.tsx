import { useTranslation } from 'react-i18next'
import { COMPARE_MAX, useCollections } from '../lib/collections'
import { useToast } from './ui/Toast'

const btn =
  'flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors ' +
  'hover:bg-black/80 aria-pressed:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'

/** Два круглых значка: в избранное (сердце) и в сравнение (стрелки). */
export default function ItemActions({ id }: { id: number }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { favorites, compare, toggleFavorite, toggleCompare } = useCollections()
  const fav = favorites.includes(id)
  const cmp = compare.includes(id)

  const onCompare = () => {
    if (!toggleCompare(id)) toast(t('actions.compareFull', { count: COMPARE_MAX }), 'error')
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className={btn}
        aria-pressed={fav}
        aria-label={fav ? t('actions.favoriteRemove') : t('actions.favoriteAdd')}
        title={fav ? t('actions.favoriteRemove') : t('actions.favoriteAdd')}
        onClick={() => toggleFavorite(id)}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        className={btn}
        aria-pressed={cmp}
        aria-label={cmp ? t('actions.compareRemove') : t('actions.compareAdd')}
        title={cmp ? t('actions.compareRemove') : t('actions.compareAdd')}
        onClick={onCompare}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 8h14m0 0-3-3m3 3-3 3M20 16H6m0 0 3-3m-3 3 3 3" />
        </svg>
      </button>
    </div>
  )
}
