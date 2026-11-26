import { useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { useCollections } from '../lib/collections'

/**
 * Избранное в аккаунте. После входа список из браузера объединяется с сохранённым в базе, затем каждое изменение уходит на сервер.
 * Гость по-прежнему хранит избранное только в браузере. Компонент ничего не показывает.
 */
export default function FavoritesSync() {
  const { loggedIn, api } = useAuth()
  const { favorites, replaceFavorites } = useCollections()
  const synced = useRef(false)
  const last = useRef('')

  // первый вход: объединяем
  useEffect(() => {
    if (!loggedIn) {
      // вышли из аккаунта: его избранное не должно достаться следующему человеку на этом устройстве
      if (synced.current) replaceFavorites([])
      synced.current = false
      last.current = ''
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const remote = (await api<{ ids: number[] }>('/me/favorites')).ids
        if (cancelled) return
        const merged = [...new Set([...remote, ...favorites])].slice(0, 200)
        const saved = (await api<{ ids: number[] }>('/me/favorites', { method: 'PUT', body: JSON.stringify({ ids: merged }) })).ids
        if (cancelled) return
        last.current = saved.join(',')
        replaceFavorites(saved)
        synced.current = true
      } catch {
        /* сервер недоступен: избранное остаётся в браузере */
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- объединение выполняется один раз на вход
  }, [loggedIn])

  // дальше: изменения отправляем на сервер
  useEffect(() => {
    if (!loggedIn || !synced.current) return
    const key = favorites.join(',')
    if (key === last.current) return
    last.current = key
    api('/me/favorites', { method: 'PUT', body: JSON.stringify({ ids: favorites }) }).catch(() => undefined)
  }, [favorites, loggedIn, api])

  return null
}
