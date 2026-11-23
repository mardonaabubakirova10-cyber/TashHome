import { Router } from 'express'
import { HttpError } from '../lib/errors.js'
import { filtersSchema } from '../lib/propertyFilters.js'
import type { Store } from '../lib/store.js'

/** Каталог: /properties (фильтры, сортировка, страницы), /properties/:id, /districts. */
export function catalogRouter(store: Store) {
  const router = Router()

  router.get('/properties', async (req, res) => {
    res.json(await store.listProperties(filtersSchema.parse(req.query)))
  })

  router.get('/properties/:id', async (req, res) => {
    const id = Number(req.params.id)
    if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'Неверный номер объекта')
    const property = await store.getProperty(id)
    if (!property) throw new HttpError(404, 'Объект не найден')
    res.json(property)
  })

  router.get('/districts', async (_req, res) => {
    res.json(await store.listDistricts())
  })
  return router
}
