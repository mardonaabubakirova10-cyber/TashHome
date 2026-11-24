import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../lib/auth'

/** Страница возврата после входа через Google: забирает ключи из адреса, убирает их из истории и открывает кабинет. */
export default function AuthCallback() {
  const { t } = useTranslation()
  const { completeOAuth } = useAuth()
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // в режиме разработки эффект запускается дважды, а ключи одноразовые
    started.current = true
    const hash = window.location.hash
    window.history.replaceState(null, '', window.location.pathname) // ключи не должны оставаться в адресе и истории
    completeOAuth(hash).then((ok) => (ok ? navigate('/account', { replace: true }) : setFailed(true)))
  }, [completeOAuth, navigate])

  if (!failed) return <p className="py-16 text-center text-slate-600">{t('account.signingIn')}</p>
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl">{t('account.failedTitle')}</h1>
      <p className="mt-2 text-slate-600">{t('account.failedText')}</p>
      <Link to="/login" className="mt-4 inline-block text-brand-100 hover:underline">
        {t('account.tryAgain')} →
      </Link>
    </div>
  )
}
