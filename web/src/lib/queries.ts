import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import type { Property } from '../data/properties'
import { ApiError, getProperties, getProperty } from './api'
import { filtersToParams, type Filters } from './filters'

const STALE = 5 * 60_000

/** Страница каталога с фильтрами; при смене страницы прежняя остаётся на экране, пока грузится новая. */
export const useCatalog = (f: Filters) =>
  useQuery({ queryKey: ['properties', filtersToParams(f)], queryFn: () => getProperties(filtersToParams(f)), placeholderData: keepPreviousData, staleTime: 60_000 })

/** Один дом; 404 не повторяется. */
export const useProperty = (id: string | undefined) =>
  useQuery({
    queryKey: ['property', id],
    queryFn: () => getProperty(id!),
    enabled: Boolean(id) && /^\d+$/.test(id ?? ''),
    staleTime: STALE,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  })

/** Несколько домов по номерам (избранное, сравнение). Исчезнувшие из базы дома молча пропускаются. */
export function useProperties(ids: number[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['property', String(id)],
      queryFn: () => getProperty(id),
      staleTime: STALE,
      retry: (n: number, e: Error) => !(e instanceof ApiError && e.status === 404) && n < 2,
    })),
  })
  return {
    items: results.map((r) => r.data).filter((p): p is Property => p !== undefined),
    loading: results.some((r) => r.isPending),
  }
}

/** Свежие дома на продажу для главной (карусель, мозаика, текстуры) и общее число домов. */
export const useHomeHouses = () =>
  useQuery({ queryKey: ['home-houses'], queryFn: () => getProperties({ deal: 'sale', pageSize: 24 }), staleTime: STALE })

export const useTotalHouses = () =>
  useQuery({ queryKey: ['total-houses'], queryFn: () => getProperties({ pageSize: 1 }), staleTime: STALE, select: (d) => d.total })
