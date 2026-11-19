import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function PropertyMap({ lat, lng }: { lat: number; lng: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const map = L.map(ref.current, { scrollWheelZoom: false }).setView([lat, lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    }).addTo(map)
    // circleMarker не требует картинок маркера, которые ломаются при сборке
    L.circleMarker([lat, lng], { radius: 10, color: '#1d4ed8', fillColor: '#2563eb', fillOpacity: 0.9 }).addTo(map)
    return () => {
      map.remove()
    }
  }, [lat, lng])

  return <div ref={ref} className="z-0 h-64 w-full overflow-hidden rounded-xl border border-slate-200" />
}
