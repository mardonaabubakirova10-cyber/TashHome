import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function Placeholder({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <section>
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      <p className="mt-2 text-slate-500">{t('pages.notFoundText')}</p>
      <Link to="/" className="mt-4 inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-200">
        {t('pages.toHome')}
      </Link>
    </section>
  )
}
