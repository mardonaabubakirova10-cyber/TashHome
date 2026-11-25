import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import * as THREE from 'three'

/**
 * Объёмная Ташкентская телебашня: одна на всю высоту страницы, слева за содержимым.
 * Башня выше экрана: при прокрутке камера спускается от антенны к основанию.
 * Она медленно вращается, мигают огни, по стволу бежит свет, вокруг площадок кружат кольца и искры.
 * На главной скрыта на первом экране (там ковёр из фото). Клики проходят сквозь неё.
 */

const TOP = 33 // высота взгляда в начале страницы (видна антенна)
const BOTTOM = 8 // и в конце (видно основание)

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function buildTower() {
  const tower = new THREE.Group()
  const fill = (color: number, opacity: number, glow = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity,
      metalness: 0.2,
      roughness: 0.55,
      emissive: glow ? color : 0x000000,
      emissiveIntensity: glow,
      depthWrite: false,
    })
  const wall = fill(0x56627f, 0.6)
  const slab = fill(0x8794b8, 0.7)
  const warm = fill(0xffb866, 0.8, 0.9)
  const line = new THREE.LineBasicMaterial({ color: 0xeaf0ff, transparent: true, opacity: 0.9 })
  const blue = new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.9 })

  /** Объём вместе с контуром по рёбрам, как у остальных 3D-картин сайта. */
  const solid = (geo: THREE.BufferGeometry, material: THREE.Material, edges = line) => {
    const group = new THREE.Group()
    group.add(new THREE.Mesh(geo, material), new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), edges))
    tower.add(group)
    return group
  }
  /** Брус от точки a до точки b: толщина r0 внизу и r1 вверху. */
  const beam = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, sides = 6) => {
    const dir = b.clone().sub(a)
    const group = solid(new THREE.CylinderGeometry(r1, r0, dir.length(), sides, 1, true), wall)
    group.position.copy(a).addScaledVector(dir, 0.5)
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  }
  const disk = (y: number, rTop: number, rBottom: number, h: number, material: THREE.Material, sides = 16, edges = line) => {
    solid(new THREE.CylinderGeometry(rTop, rBottom, h, sides), material, edges).position.y = y
  }

  // три наклонные опоры; пояса и раскосы — линиями
  const legPoint = (i: number, y: number) => {
    const angle = (i / 3) * Math.PI * 2
    const radius = 6 - (y / 18) * 4.8
    return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
  }
  const belts = [0.4, 5, 10, 14.5, 18]
  const braces: THREE.Vector3[] = []
  for (let i = 0; i < 3; i++) {
    beam(legPoint(i, 0), legPoint(i, 18), 0.55, 0.3)
    belts.forEach((y, k) => {
      braces.push(legPoint(i, y), legPoint(i + 1, y))
      const next = belts[k + 1]
      if (next) braces.push(legPoint(i, y), legPoint(i + 1, next), legPoint(i + 1, y), legPoint(i, next))
    })
  }
  tower.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(braces), blue))
  beam(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 30, 0), 0.8, 0.4, 10)

  // три площадки: основание, окна, крыша
  for (const [y, r] of [
    [18.2, 2.8],
    [24.5, 1.9],
    [29.6, 1.15],
  ]) {
    disk(y, r, r * 0.65, 0.9, wall)
    disk(y + 0.65, r * 0.94, r * 0.94, 0.4, warm, 24, blue)
    disk(y + 0.98, r * 1.08, r * 1.08, 0.26, slab)
  }

  // антенна: секции через одну залиты цветом
  for (let i = 0; i < 7; i++) disk(31.4 + i * 1.3, 0.3 - i * 0.032, 0.33 - i * 0.032, 1.3, i % 2 ? slab : warm, 6)

  return tower
}

export default function TvTower() {
  const host = useRef<HTMLDivElement>(null)
  const home = useLocation().pathname === '/'

  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // нет WebGL
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setClearColor(0x000000, 0)
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
    scene.add(new THREE.AmbientLight(0x8090d0, 1.1))
    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.position.set(8, 20, 14)
    scene.add(sun)

    const tower = buildTower()
    scene.add(tower)

    // кольца вокруг площадок
    const rings = [
      [18.8, 4.1, 0x9fb4ff],
      [25, 3, 0xeaf0ff],
      [30.2, 2.1, 0xffb866],
    ].map(([y, r, color]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.045, 6, 80), new THREE.MeshBasicMaterial({ color }))
      ring.position.y = y
      scene.add(ring)
      return ring
    })

    // огонь на вершине и бегущий по стволу свет
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff4d4d, transparent: true }))
    beacon.position.y = 40.2
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), new THREE.MeshBasicMaterial({ color: 0x9fe9ff, transparent: true, opacity: 0.85 }))
    scene.add(beacon, pulse)

    // искры вокруг башни; набор всегда одинаковый (без случайных чисел)
    const COUNT = 220
    const points = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const angle = i * 2.39996
      const radius = 3 + ((i * 37) % 50) / 10
      points.set([Math.cos(angle) * radius, (i / COUNT) * 42, Math.sin(angle) * radius], i * 3)
    }
    const sparkGeo = new THREE.BufferGeometry()
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(points, 3))
    const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ color: 0xbfd4ff, size: 0.16, transparent: true, opacity: 0.8 }))
    scene.add(sparks)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let target = 0 // доля прокрутки страницы, 0…1
    let shown = 0

    const draw = (t: number) => {
      const y = TOP + (BOTTOM - TOP) * shown
      // на телефоне холст узкий: камера дальше, чтобы площадки помещались по ширине
      camera.position.set(0.6, y + 1.5, window.innerWidth < 640 ? 46 : 34)
      camera.lookAt(0.6, y, 0)
      tower.rotation.y = t * 0.22 + shown * Math.PI * 1.5
      rings.forEach((ring, i) => {
        ring.rotation.set(Math.PI / 2 + Math.sin(t * 0.8 + i * 2) * 0.22, Math.cos(t * 0.6 + i) * 0.22, 0)
        ring.scale.setScalar(1 + Math.sin(t * 1.4 + i * 2) * 0.05)
      })
      ;(beacon.material as THREE.MeshBasicMaterial).opacity = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.4))
      pulse.position.y = (t * 6) % 31
      sparks.rotation.y = -t * 0.12
      sparks.position.y = Math.sin(t * 0.5) * 0.8
      renderer.render(scene, camera)
    }

    const onScroll = () => {
      // на главной первый экран остаётся без башни: она проявляется, когда его пролистали
      const start = home ? window.innerHeight * 0.75 : 0
      const end = document.documentElement.scrollHeight - window.innerHeight
      target = end > start ? Math.min(1, Math.max(0, (window.scrollY - start) / (end - start))) : 0
      el.style.setProperty('--show', String(home ? smooth(window.innerHeight * 0.45, window.innerHeight * 0.85, window.scrollY) : 1))
      if (reduced) shown = target
      draw(reduced ? 0 : performance.now() / 1000)
    }

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      onScroll()
    }
    resize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', resize)
    // высота страницы меняется, когда подгружаются данные
    const grown = new ResizeObserver(onScroll)
    grown.observe(document.body)

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (el.style.getPropertyValue('--show') === '0') return // не видно — не рисуем
      shown += (target - shown) * 0.08
      draw(performance.now() / 1000)
    }
    if (!reduced) tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
      grown.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        ;(m.material as THREE.Material | undefined)?.dispose()
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [home])

  return (
    <div
      ref={host}
      aria-hidden
      className="pointer-events-none fixed inset-y-0 left-0 z-[5] w-[17rem] -translate-x-[20%] opacity-[calc(var(--show,0)*0.75)] mix-blend-screen max-lg:opacity-[calc(var(--show,0)*0.45)] [mask-image:linear-gradient(to_right,black_70%,transparent)] max-sm:w-40 max-sm:-translate-x-[32%] max-sm:opacity-[calc(var(--show,0)*0.65)]"
    />
  )
}
