import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './lib/i18n'
import { loadSiteTexts } from './lib/siteTexts'
import './index.css'
import App from './App.tsx'

void loadSiteTexts() // тексты из админки поверх стандартных; сайт не ждёт ответа

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
