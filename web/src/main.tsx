import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/i18n'
import { loadSiteTexts } from './lib/siteTexts'
import { initMiniApp } from './lib/telegram'
import { wakeMl } from './lib/wakeMl'
import './index.css'
import App from './App.tsx'

void initMiniApp() // внутри Telegram подключает его скрипт и настраивает окно; вне Telegram ничего не делает
void loadSiteTexts() // тексты из админки поверх стандартных; сайт не ждёт ответа

void wakeMl() // заранее будит сервис оценки, чтобы к расчёту он уже не спал

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
