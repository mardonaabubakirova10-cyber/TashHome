import { useTranslation } from 'react-i18next'
import ChatPanel from '../components/chat/ChatPanel'

/** Отдельная страница ассистента: тот же диалог, что и в виджете, но на всю страницу. */
export default function Assistant() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4">
      <div>
        <h1 className="text-3xl sm:text-4xl">{t('pages.assistant')}</h1>
        <p className="mt-2 text-slate-600">{t('chat.subtitle')}</p>
      </div>
      <div className="h-[min(40rem,calc(100svh-14rem))] min-h-[24rem] overflow-hidden rounded-2xl border border-slate-300 bg-slate-100">
        <ChatPanel autoFocus />
      </div>
    </div>
  )
}
