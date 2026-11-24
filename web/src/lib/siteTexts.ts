import i18n from 'i18next'
import { API_URL } from './api'

export type TextMap = { ru: Record<string, string>; uz: Record<string, string> }

/** Накладывает тексты из админки поверх стандартных из файлов локализации. */
export function applyTexts(t: TextMap) {
  for (const lang of ['ru', 'uz'] as const) {
    for (const [key, value] of Object.entries(t[lang] ?? {})) {
      if (/^home\.[A-Za-z0-9]+$/.test(key) && typeof value === 'string') i18n.addResource(lang, 'translation', key, value)
    }
  }
}

/** Загружается один раз при старте. Если сервер недоступен, сайт остаётся на стандартных текстах. */
export async function loadSiteTexts(): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/texts`)
    if (!res.ok) return
    applyTexts((await res.json()) as TextMap)
    await i18n.changeLanguage(i18n.language) // перерисовать уже показанные тексты
  } catch {
    /* стандартные тексты */
  }
}
