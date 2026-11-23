import { z } from 'zod'
import { config } from '../config.js'

/**
 * Обёртка над Gemini (REST): чат, эмбеддинги, ответы по JSON-схеме. Таймаут и повторы на сбоях сети, 429 и 5xx.
 * Ключ берётся только из окружения сервера и нигде не печатается. Если ИИ недоступен, кидается AiUnavailableError:
 * вызывающий код должен ответить мягко, а каталог и заявки при этом продолжают работать.
 */

export class AiUnavailableError extends Error {
  constructor(message = 'ИИ-сервис временно недоступен') {
    super(message)
  }
}

export type Part = { text?: string; thoughtSignature?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: unknown }; inlineData?: { mimeType: string; data: string } }
export type Content = { role: 'user' | 'model'; parts: Part[] }
export type ToolDeclaration = { name: string; description: string; parameters: Record<string, unknown> }

export type GenerateRequest = {
  system?: string
  contents: Content[]
  tools?: ToolDeclaration[]
  json?: Record<string, unknown> // схема ответа в формате Gemini
  temperature?: number
  maxOutputTokens?: number
}

export type GenerateResult = { text: string; functionCalls: Array<{ name: string; args: Record<string, unknown> }>; content: Content | null }

const API = 'https://generativelanguage.googleapis.com/v1beta'
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504])

type Options = { fetchImpl?: typeof fetch; timeoutMs?: number; retries?: number; baseDelayMs?: number; apiKey?: string }

/** Вызов с таймаутом и повторами (экспоненциальная пауза). Возвращает разобранный JSON ответа. */
async function call(path: string, body: unknown, o: Options = {}): Promise<any> {
  const key = o.apiKey ?? config.geminiKey
  if (!key) throw new AiUnavailableError('Не задан GEMINI_API_KEY')
  const doFetch = o.fetchImpl ?? fetch
  const retries = o.retries ?? 2
  let lastStatus = 0
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await doFetch(`${API}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(o.timeoutMs ?? 25_000),
      })
      if (res.ok) return await res.json()
      lastStatus = res.status
      if (!RETRY_STATUSES.has(res.status)) break // 400, 401, 403, 404: повтор не поможет
    } catch {
      lastStatus = 0 // сеть или таймаут: пробуем ещё
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, (o.baseDelayMs ?? 600) * 2 ** attempt))
  }
  throw new AiUnavailableError(`Gemini: не удалось получить ответ (статус ${lastStatus || 'сеть'})`)
}

/** Один шаг генерации: текст и/или вызовы инструментов. */
export async function generate(req: GenerateRequest, o: Options = {}): Promise<GenerateResult> {
  const body: Record<string, unknown> = {
    contents: req.contents,
    generationConfig: {
      temperature: req.temperature ?? 0.3,
      ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}),
      ...(req.json ? { responseMimeType: 'application/json', responseSchema: req.json } : {}),
    },
  }
  if (req.system) body.systemInstruction = { parts: [{ text: req.system }] }
  if (req.tools?.length) body.tools = [{ functionDeclarations: req.tools }]

  const data = await call(`models/${config.geminiChatModel}:generateContent`, body, o)
  const content = (data?.candidates?.[0]?.content ?? null) as Content | null
  const parts = content?.parts ?? []
  return {
    text: parts.map((p) => p.text ?? '').join(''),
    functionCalls: parts.filter((p) => p.functionCall).map((p) => p.functionCall!),
    content,
  }
}

/**
 * Потоковая генерация (SSE): текст отдаётся по мере появления через onText, вызовы инструментов собираются целиком.
 * Повторы возможны только до начала потока; обрыв посреди ответа считается сбоем ИИ.
 */
export async function generateStream(req: GenerateRequest, onText: (chunk: string) => void, o: Options = {}): Promise<GenerateResult> {
  const key = o.apiKey ?? config.geminiKey
  if (!key) throw new AiUnavailableError('Не задан GEMINI_API_KEY')
  const doFetch = o.fetchImpl ?? fetch
  const body: Record<string, unknown> = {
    contents: req.contents,
    generationConfig: { temperature: req.temperature ?? 0.3, ...(req.maxOutputTokens ? { maxOutputTokens: req.maxOutputTokens } : {}) },
  }
  if (req.system) body.systemInstruction = { parts: [{ text: req.system }] }
  if (req.tools?.length) body.tools = [{ functionDeclarations: req.tools }]

  const retries = o.retries ?? 2
  let res: Response | null = null
  let lastStatus = 0
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await doFetch(`${API}/models/${config.geminiChatModel}:streamGenerateContent?alt=sse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(o.timeoutMs ?? 60_000),
      })
      if (r.ok && r.body) {
        res = r
        break
      }
      lastStatus = r.status
      if (!RETRY_STATUSES.has(r.status)) break
    } catch {
      lastStatus = 0
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, (o.baseDelayMs ?? 600) * 2 ** attempt))
  }
  if (!res?.body) throw new AiUnavailableError(`Gemini: не удалось получить ответ (статус ${lastStatus || 'сеть'})`)

  const parts: Part[] = []
  let text = ''
  const handle = (json: string) => {
    let data: any
    try {
      data = JSON.parse(json)
    } catch {
      return
    }
    for (const p of (data?.candidates?.[0]?.content?.parts ?? []) as Part[]) {
      parts.push(p)
      if (p.text) {
        text += p.text
        onText(p.text)
      }
    }
  }
  try {
    const decoder = new TextDecoder()
    let buf = ''
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      buf += decoder.decode(chunk, { stream: true })
      let nl: number
      while ((nl = buf.indexOf(String.fromCharCode(10))) >= 0) {
        const line = buf.slice(0, nl).trimEnd()
        buf = buf.slice(nl + 1)
        if (line.startsWith('data:')) handle(line.slice(5).trim())
      }
    }
    if (buf.startsWith('data:')) handle(buf.slice(5).trim())
  } catch {
    throw new AiUnavailableError('Gemini: поток оборвался')
  }
  return { text, functionCalls: parts.filter((p) => p.functionCall).map((p) => p.functionCall!), content: parts.length ? { role: 'model', parts } : null }
}

/** Простой вопрос-ответ без инструментов. */
export async function chat(prompt: string, system?: string, o: Options = {}): Promise<string> {
  return (await generate({ system, contents: [{ role: 'user', parts: [{ text: prompt }] }] }, o)).text
}

/** Схема Zod → схема ответа Gemini (без служебных ключей, которые API не принимает). */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip)
    if (node && typeof node === 'object') {
      return Object.fromEntries(
        Object.entries(node as Record<string, unknown>)
          .filter(([k]) => k !== '$schema' && k !== 'additionalProperties')
          .map(([k, v]) => [k, strip(v)]),
      )
    }
    return node
  }
  return strip(z.toJSONSchema(schema)) as Record<string, unknown>
}

/** Ответ строго по схеме: Gemini отвечает JSON, сервер проверяет его через Zod. Невалидный ответ считается сбоем ИИ. */
export async function generateJson<T extends z.ZodType>(prompt: string, schema: T, system?: string, o: Options = {}): Promise<z.infer<T>> {
  const r = await generate({ system, contents: [{ role: 'user', parts: [{ text: prompt }] }], json: toGeminiSchema(schema), temperature: 0.1 }, o)
  try {
    return schema.parse(JSON.parse(r.text))
  } catch {
    throw new AiUnavailableError('Gemini вернул ответ не по схеме')
  }
}

export const EMBED_DIM = 768 // размерность колонок vector(768) в базе

/** Эмбеддинги текстов (для поиска и базы знаний). task: RETRIEVAL_DOCUMENT для хранимых текстов, RETRIEVAL_QUERY для вопросов. */
export async function embed(texts: string[], task: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT', o: Options = {}): Promise<number[][]> {
  const model = `models/${config.geminiEmbedModel}`
  // у модели есть только одиночный embedContent, поэтому тексты отправляем параллельно небольшими пачками
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 8) {
    const batch = await Promise.all(
      texts.slice(i, i + 8).map((t) => call(`${model}:embedContent`, { model, content: { parts: [{ text: t }] }, taskType: task, outputDimensionality: EMBED_DIM }, o)),
    )
    for (const d of batch) {
      const values = d?.embedding?.values as number[] | undefined
      if (!values?.length) throw new AiUnavailableError('Gemini вернул пустой эмбеддинг')
      out.push(normalize(values))
    }
  }
  return out
}

/** При уменьшенной размерности векторы нужно нормировать, иначе косинусная близость искажается. */
function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map((x) => x / n)
}
