// Бесплатный сервис оценки на Render засыпает. Запросы нашего сервера его, как показала проверка, не будят,
// а запрос из браузера будит, поэтому сайт сам «стучится» в сервис. Ответ читать не нужно (no-cors).
const ML_URL = (import.meta.env.VITE_ML_URL as string | undefined) || (import.meta.env.PROD ? 'https://tashhome-ml.onrender.com' : '')

export function wakeMl(): Promise<void> {
  if (!ML_URL) return Promise.resolve() // локальная разработка: будить нечего
  return fetch(`${ML_URL}/health`, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(70_000) }).then(
    () => undefined,
    () => undefined,
  )
}
