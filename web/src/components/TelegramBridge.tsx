import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { tg, verifyTelegramUser } from '../lib/telegram'

/**
 * Связь сайта с Telegram Mini App: кнопка «Назад» Telegram ведёт по истории сайта, язык берётся из профиля после проверки входа на сервере.
 * Вне Telegram компонент ничего не делает.
 */
export default function TelegramBridge() {
  const w = tg()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { i18n } = useTranslation()

  useEffect(() => {
    if (!w) return
    const back = () => navigate(-1)
    if (pathname === '/') w.BackButton.hide()
    else w.BackButton.show()
    w.BackButton.onClick(back)
    return () => w.BackButton.offClick(back)
  }, [w, pathname, navigate])

  const me = useQuery({ queryKey: ['tg-user'], queryFn: verifyTelegramUser, enabled: Boolean(w), staleTime: Infinity, retry: false })
  useEffect(() => {
    // первый заход из Telegram: язык по настройкам пользователя, если он ещё не выбирал сам
    try {
      if (me.data && !localStorage.getItem('lang')) void i18n.changeLanguage(me.data.lang)
    } catch {
      /* хранилище недоступно */
    }
  }, [me.data, i18n])

  return null
}
