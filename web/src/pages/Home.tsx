import { useTranslation } from 'react-i18next'

export default function Home() {
  const { t } = useTranslation()
  return (
    <section className="py-12 text-center">
      <h1 className="text-3xl font-bold sm:text-4xl">{t('home.title')}</h1>
      <p className="mt-3 text-slate-600">{t('home.subtitle')}</p>
    </section>
  )
}
