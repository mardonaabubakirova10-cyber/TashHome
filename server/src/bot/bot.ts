import { Bot, InlineKeyboard, type Context } from 'grammy'
import { runAgent, type AgentDeps } from '../ai/agent.js'
import { AiUnavailableError } from '../ai/gemini.js'
import type { Store } from '../lib/store.js'
import { propertyCaption, publicPhotoUrl, toTelegramHtml } from './format.js'
import { T, type Lang } from './strings.js'

export type BotConfig = {
  token: string
  /** Номер группы менеджеров (отрицательное число). Обращения и заявки идут туда. */
  managersChatId: number
  /** Публичный адрес сайта: ссылки в карточках и кнопка Mini App (только https) */
  webUrl: string
  /** Сообщений в минуту от одного человека */
  perMinute?: number
}

const HISTORY = 20
const MAX_VOICE_SECONDS = 60
const MAX_VOICE_BYTES = 2 * 1024 * 1024

/**
 * Telegram-бот: диалог с ассистентом (текст и голос), связь клиента с менеджерами и кнопка «Взять в работу» под заявками.
 * Бот не знает о способе запуска: polling или вебхук подключаются снаружи (см. start.ts).
 */
export function createBot(cfg: BotConfig, store: Store, agent: AgentDeps, fetchFile: (url: string) => Promise<Buffer> = defaultFetchFile): Bot {
  const bot = new Bot(cfg.token)
  const limit = cfg.perMinute ?? 15
  const hits = new Map<number, number[]>()
  const awaitingContact = new Set<number>()

  const tooFast = (chatId: number) => {
    const now = Date.now()
    const list = (hits.get(chatId) ?? []).filter((t) => now - t < 60_000)
    list.push(now)
    hits.set(chatId, list)
    return list.length > limit
  }

  const langOf = async (ctx: Context): Promise<Lang> => {
    const id = ctx.chat?.id
    if (!id) return 'ru'
    const u = await store.getBotUser(id)
    if (u) return u.lang
    // первый контакт: язык из настроек Telegram, узбекский при uz
    const lang: Lang = ctx.from?.language_code?.startsWith('uz') ? 'uz' : 'ru'
    await store.saveBotUser({ chat_id: id, lang, username: ctx.from?.username ?? null })
    return lang
  }

  const menu = (lang: Lang) => {
    const kb = new InlineKeyboard().text(T[lang].btnManager, 'contact').text(T[lang].btnLang, 'lang')
    if (/^https:\/\//.test(cfg.webUrl)) kb.row().webApp(T[lang].btnCatalog, cfg.webUrl)
    return kb
  }

  // ---------------------------------------------------------------- команды (только личные чаты)
  bot.command('start', async (ctx) => {
    if (ctx.chat.type !== 'private') return
    const lang = await langOf(ctx)
    await ctx.reply(T[lang].welcome, { reply_markup: menu(lang) })
  })
  bot.command('help', async (ctx) => {
    if (ctx.chat.type !== 'private') return
    const lang = await langOf(ctx)
    await ctx.reply(T[lang].help, { reply_markup: menu(lang) })
  })
  bot.command('lang', async (ctx) => {
    if (ctx.chat.type !== 'private') return
    await ctx.reply(`${T.ru.chooseLang} / ${T.uz.chooseLang}`, { reply_markup: new InlineKeyboard().text('Русский', 'lang:ru').text('Oʻzbekcha', 'lang:uz') })
  })
  bot.command('manager', async (ctx) => {
    if (ctx.chat.type !== 'private') return
    const lang = await langOf(ctx)
    awaitingContact.add(ctx.chat.id)
    await ctx.reply(T[lang].contactPrompt)
  })
  bot.command('new', async (ctx) => {
    if (ctx.chat.type !== 'private') return
    const lang = await langOf(ctx)
    await store.saveBotUser({ chat_id: ctx.chat.id, session_id: null })
    await ctx.reply(T[lang].newDialog)
  })

  // ---------------------------------------------------------------- кнопки
  bot.callbackQuery('lang', async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.reply(`${T.ru.chooseLang} / ${T.uz.chooseLang}`, { reply_markup: new InlineKeyboard().text('Русский', 'lang:ru').text('Oʻzbekcha', 'lang:uz') })
  })
  bot.callbackQuery(/^lang:(ru|uz)$/, async (ctx) => {
    const lang = ctx.match[1] as Lang
    if (ctx.chat) await store.saveBotUser({ chat_id: ctx.chat.id, lang, username: ctx.from.username ?? null })
    await ctx.answerCallbackQuery()
    await ctx.reply(T[lang].langChosen, { reply_markup: menu(lang) })
  })
  bot.callbackQuery('contact', async (ctx) => {
    const lang = await langOf(ctx)
    if (ctx.chat) awaitingContact.add(ctx.chat.id)
    await ctx.answerCallbackQuery()
    await ctx.reply(T[lang].contactPrompt)
  })

  // «Взять в работу» под заявкой: только из группы менеджеров
  bot.callbackQuery(/^take:(\d+)$/, async (ctx) => {
    if (ctx.chat?.id !== cfg.managersChatId) return ctx.answerCallbackQuery({ text: 'Недоступно' })
    const id = Number(ctx.match[1])
    const who = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name
    const open = await store.adminGetLead(id)
    if (!open) return ctx.answerCallbackQuery({ text: 'Заявка не найдена' })
    if (open.status !== 'new') return ctx.answerCallbackQuery({ text: 'Заявка уже в работе' })
    await store.adminUpdateLead(id, { status: 'in_progress' })
    await ctx.answerCallbackQuery({ text: 'Заявка закреплена за вами' })
    const msg = ctx.callbackQuery.message
    if (msg && 'text' in msg && msg.text) {
      await ctx.editMessageText(`${msg.text}\n\n✅ В работе: ${who}`, { reply_markup: new InlineKeyboard() })
    }
  })

  // ---------------------------------------------------------------- группа менеджеров: ответ клиенту
  bot.on('message', async (ctx, next) => {
    if (ctx.chat.id !== cfg.managersChatId) return next()
    const replyTo = ctx.message.reply_to_message?.message_id
    if (!replyTo || !ctx.message.text) return // обычный разговор менеджеров бот не трогает
    const client = await store.getBotThread(replyTo)
    if (!client) return
    const lang = (await store.getBotUser(client))?.lang ?? 'ru'
    try {
      await ctx.api.sendMessage(client, `<b>${T[lang].managerReply}:</b>\n${toTelegramHtml(ctx.message.text)}`, { parse_mode: 'HTML' })
      await ctx.react('👍')
    } catch {
      await ctx.reply('Не удалось доставить: клиент мог заблокировать бота.', { reply_parameters: { message_id: ctx.message.message_id } })
    }
  })

  // ---------------------------------------------------------------- личные сообщения
  const handleText = async (ctx: Context, chatId: number, text: string) => {
    const lang = await langOf(ctx)
    if (tooFast(chatId)) return void (await ctx.reply(T[lang].tooFast))

    if (awaitingContact.has(chatId)) {
      awaitingContact.delete(chatId)
      const who = ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name ?? 'клиент')
      const sent = await ctx.api.sendMessage(cfg.managersChatId, `💬 <b>Обращение клиента</b> (${toTelegramHtml(who)})\n${toTelegramHtml(text.slice(0, 1500))}\n\n<i>Ответьте на это сообщение, и ответ уйдёт клиенту.</i>`, { parse_mode: 'HTML' })
      await store.saveBotThread(sent.message_id, chatId)
      return void (await ctx.reply(T[lang].contactSent))
    }

    await ctx.replyWithChatAction('typing').catch(() => undefined)
    let user = await store.getBotUser(chatId)
    let sessionId = user?.session_id ?? null
    if (!sessionId || !(await store.chatSessionExists(sessionId))) {
      sessionId = await store.createChatSession('bot')
      user = await store.saveBotUser({ chat_id: chatId, session_id: sessionId })
    }
    const history = await store.getChatHistory(sessionId, HISTORY)
    await store.addChatMessage({ session_id: sessionId, role: 'user', content: text })
    const started = Date.now()
    try {
      const r = await runAgent(
        {
          history: history.filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content).map((m) => ({ role: m.role as 'user' | 'assistant', text: m.content! })),
          message: text,
          lang,
          allowLead: history.length >= 2,
        },
        agent,
      )
      await store.addChatMessage({ session_id: sessionId, role: 'assistant', content: r.text, tool_calls: r.tools.length ? r.tools : undefined, latency_ms: Date.now() - started })
      if (r.text) await ctx.reply(toTelegramHtml(r.text), { parse_mode: 'HTML' })
      for (const p of r.properties.slice(0, 3)) {
        const caption = propertyCaption(p, lang, cfg.webUrl)
        const photo = publicPhotoUrl(p.photo, cfg.webUrl)
        if (photo) {
          try {
            await ctx.replyWithPhoto(photo, { caption, parse_mode: 'HTML' })
            continue
          } catch {
            /* фото недоступно: отправим карточку текстом */
          }
        }
        await ctx.reply(caption, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } })
      }
    } catch (e) {
      if (!(e instanceof AiUnavailableError)) console.error('bot:', e instanceof Error ? e.message : e)
      await ctx.reply(T[lang].aiDown)
    }
  }

  bot.on('message:text', async (ctx, next) => {
    if (ctx.chat.type !== 'private' || ctx.message.text.startsWith('/')) return next()
    await handleText(ctx, ctx.chat.id, ctx.message.text.slice(0, 1000))
  })

  bot.on('message:voice', async (ctx) => {
    if (ctx.chat.type !== 'private') return
    const lang = await langOf(ctx)
    const v = ctx.message.voice
    if (v.duration > MAX_VOICE_SECONDS || (v.file_size ?? 0) > MAX_VOICE_BYTES) return void (await ctx.reply(T[lang].voiceTooLong))
    if (tooFast(ctx.chat.id)) return void (await ctx.reply(T[lang].tooFast))
    let text = ''
    try {
      const file = await ctx.api.getFile(v.file_id)
      const audio = await fetchFile(`https://api.telegram.org/file/bot${cfg.token}/${file.file_path}`)
      text = await agent.transcribe(audio, 'audio/ogg')
    } catch {
      return void (await ctx.reply(T[lang].voiceFailed))
    }
    if (!text) return void (await ctx.reply(T[lang].voiceEmpty))
    await ctx.reply(`🎤 ${T[lang].heard}: «${text}»`)
    await handleText(ctx, ctx.chat.id, text.slice(0, 1000))
  })

  bot.on('message', async (ctx) => {
    if (ctx.chat.type !== 'private') return
    await ctx.reply(T[await langOf(ctx)].textOnly)
  })

  bot.catch((err) => console.error('bot error:', err.error instanceof Error ? err.error.message : err.error))
  return bot
}

async function defaultFetchFile(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`file ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}
