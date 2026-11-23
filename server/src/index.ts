import { createApp } from './app.js'
import { config } from './config.js'
import { createMemoryStore } from './lib/store.js'
import { notifierFromConfig } from './lib/notifier.js'
import { analyzeReviewWithGemini } from './ai/reviewAnalysis.js'
import { createAgentDeps } from './ai/deps.js'
import { createSupabaseAuth, denyAllAuth } from './lib/auth.js'
import { createSupabaseStore } from './lib/supabaseStore.js'

const useDb = Boolean(config.supabaseUrl && config.supabaseKey)
const store = useDb ? createSupabaseStore(config.supabaseUrl, config.supabaseKey) : createMemoryStore()

const notifier = notifierFromConfig()
createApp(store, notifier, createAgentDeps(store, notifier), analyzeReviewWithGemini, useDb ? createSupabaseAuth(config.supabaseUrl, config.supabaseKey) : denyAllAuth).listen(config.port, () => {
  console.log(`API: http://localhost:${config.port}/api/health (хранилище: ${useDb ? 'Supabase' : 'память'})`)
})
