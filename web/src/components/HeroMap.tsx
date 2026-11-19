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

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution: '© OpenStreetMap © CARTO',
    }).addTo(map)

    PROPERTIES.forEach((p) => {
      L.circleMarker([p.lat, p.lng], { radius: 7, color: '#f0d3bf', weight: 1.5, fillColor: '#b8532c', fillOpacity: 0.95 })
        .addTo(map)
        .on('click', () => navigate(`/catalog/${p.id}`))
    })

    return () => {
      map.remove()
    }
  }, [navigate])

  return <div ref={ref} className="size-full" aria-hidden />
}
