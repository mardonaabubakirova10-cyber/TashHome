import { createApp } from './app.js'
import { config } from './config.js'
import { createMemoryStore } from './lib/store.js'
import { notifierFromConfig } from './lib/notifier.js'
import { createSupabaseStore } from './lib/supabaseStore.js'

const useDb = Boolean(config.supabaseUrl && config.supabaseKey)
const store = useDb ? createSupabaseStore(config.supabaseUrl, config.supabaseKey) : createMemoryStore()

createApp(store, notifierFromConfig()).listen(config.port, () => {
  console.log(`API: http://localhost:${config.port}/api/health (хранилище: ${useDb ? 'Supabase' : 'память'})`)
})
