/**
 * Разбиение текста на фрагменты для поиска: примерно по 800 символов с перекрытием 150.
 * Режем по абзацам и предложениям, чтобы фрагмент не обрывался посреди мысли.
 */
export function chunkText(text: string, size = 800, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (!clean) return []
  // единицы разбиения: абзацы, а слишком длинные абзацы дробим по предложениям
  const units = clean
    .split(/\n{2,}/)
    .flatMap((p) => (p.length <= size ? [p.trim()] : (p.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g) ?? [p]).map((s) => s.trim())))
    .filter(Boolean)

  const chunks: string[] = []
  let cur = ''
  for (const u of units) {
    if (cur && cur.length + u.length + 2 > size) {
      chunks.push(cur)
      // перекрытие: берём хвост предыдущего фрагмента по границе слова
      const tail = cur.slice(-overlap)
      const cut = tail.search(/\s/)
      cur = (cut >= 0 ? tail.slice(cut + 1) : tail).trim()
    }
    cur = cur ? `${cur}\n\n${u}` : u
  }
  if (cur) chunks.push(cur)
  return chunks
}

/** Название документа: первая строка вида «# Заголовок», иначе имя файла. */
export function documentTitle(text: string, fallback: string): string {
  return text.match(/^#\s+(.+)$/m)?.[1].trim() || fallback
}
