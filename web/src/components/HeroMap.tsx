import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { PROPERTIES } from '../data/properties'

/** Тёмная карта Ташкента для фона главной: точки — дома из каталога, по клику открывается страница дома. */
export default function HeroMap() {
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

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

    PROPERTIES.forEach((p) => {
      L.circleMarker([p.lat, p.lng], { radius: 7, color: '#ffffff', weight: 1.5, fillColor: '#c026d3', fillOpacity: 0.95 })
        .addTo(map)
        .on('click', () => navigate(`/catalog/${p.id}`))
    })

    return () => {
      map.remove()
    }
  }, [navigate])

  return <div ref={ref} className="size-full" aria-hidden />
}
