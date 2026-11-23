import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Тёмная карта Ташкента — фон главного экрана, без точек. */
export default function HeroMap() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const map = L.map(ref.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      keyboard: false,
      // на телефоне карта не перехватывает прокрутку страницы
      dragging: !L.Browser.mobile,
      touchZoom: false,
    }).setView([41.31, 69.26], 11)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map)

    return () => {
      map.remove()
    }
  }, [])

  return <div ref={ref} className="size-full" aria-hidden />
}
