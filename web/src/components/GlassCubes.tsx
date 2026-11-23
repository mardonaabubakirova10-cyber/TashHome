import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { HOUSE_PHOTOS } from '../data/photos'

/**
 * 3D-фон: облако полупрозрачных кубов с фотографиями домов на гранях. Медленно вращается и чуть поворачивается за мышью.
 * Рисует на WebGL; если он недоступен, остаётся пустой блок. При «уменьшить движение» рисуется один неподвижный кадр.
 */
export default function GlassCubes({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // нет WebGL
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    camera.position.set(0, 0, 9.4)

    // освещение: холодный свет сверху-слева и розово-фиолетовая подсветка снизу-справа
    scene.add(new THREE.AmbientLight(0x3a4a7a, 1.4))
    const key = new THREE.DirectionalLight(0x9db4ff, 2.6)
    key.position.set(-4, 5, 6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0xd07bff, 2.2)
    rim.position.set(5, -4, 3)
    scene.add(rim)

    // фото домов для граней
    const loader = new THREE.TextureLoader()
    const textures = HOUSE_PHOTOS.slice(0, 8).map((src) => {
      const t = loader.load(src)
      t.colorSpace = THREE.SRGBColorSpace
      return t
    })

    const group = new THREE.Group()
    scene.add(group)
    const box = new THREE.BoxGeometry(1, 1, 1)
    const edges = new THREE.EdgesGeometry(box)
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xb8c6ff, transparent: true, opacity: 0.55 })
    const materials: THREE.Material[] = [edgeMat]

    // псевдослучайный, но одинаковый при каждом запуске порядок
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

    let n = 0
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (rnd() < 0.38 && !(x === 0 && y === 0 && z === 0)) continue // часть кубов пропускаем: облако получается рваным
          const tex = textures[n++ % textures.length]
          const mat = new THREE.MeshStandardMaterial({
            map: tex,
            emissive: 0xffffff,
            emissiveMap: tex,
            emissiveIntensity: 0.28,
            metalness: 0.55,
            roughness: 0.22,
            transparent: true,
            opacity: 0.9,
          })
          materials.push(mat)
          const cube = new THREE.Mesh(box, mat)
          cube.add(new THREE.LineSegments(edges, edgeMat))
          const s = 0.62 + rnd() * 0.32
          cube.scale.setScalar(s)
          cube.position.set(x * 1.35 + (rnd() - 0.5) * 0.5, y * 1.35 + (rnd() - 0.5) * 0.5, z * 1.35 + (rnd() - 0.5) * 0.5)
          cube.rotation.set(rnd() * 0.6, rnd() * 0.6, rnd() * 0.6)
          group.add(cube)
        }
      }
    }
    group.rotation.set(0.35, 0.5, 0)

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      // на узком экране отодвигаем камеру, чтобы облако помещалось
      camera.position.z = w / h < 1 ? 12 : 9.4
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const mouse = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2
      mouse.y = ((e.clientY - r.top) / r.height - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let visible = true
    let raf = 0
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(el)

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible) return
      group.rotation.y += 0.0035
      group.rotation.x += (0.35 + mouse.y * 0.25 - group.rotation.x) * 0.04
      group.position.x += (0.7 + mouse.x * 0.35 - group.position.x) * 0.04
      renderer.render(scene, camera)
    }
    if (reduced) renderer.render(scene, camera)
    else tick()
    // когда фото догрузятся, статичный кадр нужно перерисовать
    const redraw = window.setInterval(() => reduced && renderer.render(scene, camera), 800)

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(redraw)
      window.removeEventListener('pointermove', onMove)
      io.disconnect()
      ro.disconnect()
      textures.forEach((t) => t.dispose())
      materials.forEach((m) => m.dispose())
      box.dispose()
      edges.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className={className} aria-hidden />
}
