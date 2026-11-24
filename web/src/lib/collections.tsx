import { createContext, useContext, useState, type ReactNode } from 'react'

export const COMPARE_MAX = 4

type Ctx = {
  favorites: number[]
  compare: number[]
  toggleFavorite: (id: number) => void
  /** Заменяет список целиком (синхронизация с аккаунтом) */
  replaceFavorites: (ids: number[]) => void
  /** false, если список сравнения заполнен и дом добавить нельзя */
  toggleCompare: (id: number) => boolean
  clearCompare: () => void
}

const CollectionsContext = createContext<Ctx | null>(null)

function load(key: string): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(raw) ? raw.filter((x) => Number.isInteger(x)) : []
  } catch {
    return []
  }
}

function save(key: string, ids: number[]) {
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    /* localStorage недоступен: список живёт до перезагрузки страницы */
  }
}

/** Избранное и сравнение. Пока хранятся в браузере; после входа в аккаунт избранное переедет в базу. */
export function CollectionsProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<number[]>(() => load('favorites'))
  const [compare, setCompare] = useState<number[]>(() => load('compare'))

  const toggleFavorite = (id: number) => {
    const next = favorites.includes(id) ? favorites.filter((x) => x !== id) : [...favorites, id]
    setFavorites(next)
    save('favorites', next)
  }

  const replaceFavorites = (ids: number[]) => {
    setFavorites(ids)
    save('favorites', ids)
  }

  const toggleCompare = (id: number) => {
    if (compare.includes(id)) {
      const next = compare.filter((x) => x !== id)
      setCompare(next)
      save('compare', next)
      return true
    }
    if (compare.length >= COMPARE_MAX) return false
    const next = [...compare, id]
    setCompare(next)
    save('compare', next)
    return true
  }

  const clearCompare = () => {
    setCompare([])
    save('compare', [])
  }

  return (
    <CollectionsContext value={{ favorites, compare, toggleFavorite, replaceFavorites, toggleCompare, clearCompare }}>
      {children}
    </CollectionsContext>
  )
}

export function useCollections() {
  const ctx = useContext(CollectionsContext)
  if (!ctx) throw new Error('useCollections вне CollectionsProvider')
  return ctx
}
