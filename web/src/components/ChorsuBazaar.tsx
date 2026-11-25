import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * 3D-базар Чорсу в том же стиле, что и дом в блоке «Как это работает»: светлые контуры, полупрозрачные синие объёмы,
 * тёплые окна, проволочные деревья и сетка на земле. Медленно покачивается и поворачивается за мышью.
 */
function buildBazaar() {
  const world = new THREE.Group()
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
  const domeFill = fill(0x66739a, 0.45)
  const slab = fill(0x8794b8, 0.75)
  const warm = fill(0xffb866, 0.8, 0.9)
  const line = new THREE.LineBasicMaterial({ color: 0xeaf0ff, transparent: true, opacity: 0.85 })
  const blue = new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.9 })
  const tree = new THREE.LineBasicMaterial({ color: 0xb8c6ff, transparent: true, opacity: 0.8 })

  /** Объём вместе с контуром по рёбрам. */
  const add = (geo: THREE.BufferGeometry, material: THREE.Material | null, x = 0, y = 0, z = 0, edges = line, parent: THREE.Object3D = world) => {
    const group = new THREE.Group()
    group.position.set(x, y, z)
    if (material) group.add(new THREE.Mesh(geo, material))
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), edges))
    parent.add(group)
    return group
  }
  const dome = (r: number, sides: number) => new THREE.SphereGeometry(r, sides, 6, 0, Math.PI * 2, 0, Math.PI / 2)

  // барабан с арками
  add(new THREE.CylinderGeometry(3.9, 4, 1.8, 20, 1, true), wall, 0, 0.9)
  add(new THREE.CylinderGeometry(4.3, 4.3, 0.22, 20), slab, 0, 1.9)
  const arch = new THREE.Shape()
  arch.moveTo(-0.34, 0)
  arch.lineTo(-0.34, 0.75)
  arch.quadraticCurveTo(-0.32, 1.05, 0, 1.28)
  arch.quadraticCurveTo(0.32, 1.05, 0.34, 0.75)
  arch.lineTo(0.34, 0)
  arch.closePath()
  const archGeo = new THREE.ShapeGeometry(arch, 5)
  for (let i = 0; i < 20; i++) {
    const angle = ((i + 0.5) / 20) * Math.PI * 2
    const door = add(archGeo, i % 2 ? warm : null, Math.sin(angle) * 4.02, 0.1, Math.cos(angle) * 4.02, blue)
    door.rotation.y = angle
  }

  // большой купол с меридианами и фонариком наверху
  add(dome(3.9, 24), domeFill, 0, 2).scale.y = 0.95
  add(new THREE.CylinderGeometry(0.6, 0.7, 0.6, 8), warm, 0, 5.95, 0, blue)
  add(new THREE.CylinderGeometry(0.85, 0.85, 0.12, 8), slab, 0, 6.3)
  add(dome(0.65, 8), domeFill, 0, 6.36)
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 4), null, 0, 7.45)

  // маленькие купола по кругу
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6
    const x = Math.sin(angle) * 6
    const z = Math.cos(angle) * 6
    add(new THREE.CylinderGeometry(0.9, 0.95, 1, 10, 1, true), wall, x, 0.5, z)
    add(new THREE.CylinderGeometry(1.05, 1.05, 0.12, 10), slab, x, 1.06, z)
    add(dome(0.9, 10), domeFill, x, 1.12, z)
  }

  // прилавки с навесами
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    const stall = new THREE.Group()
    stall.position.set(Math.sin(angle) * 6.6, 0, Math.cos(angle) * 6.6)
    stall.rotation.y = angle
    world.add(stall)
    add(new THREE.BoxGeometry(1.4, 0.5, 0.7), warm, 0, 0.25, 0, blue, stall)
    add(new THREE.BoxGeometry(1.7, 0.08, 1.05), slab, 0, 1.35, 0.05, line, stall).rotation.x = 0.25
    for (const x of [-0.7, 0.7]) add(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 4), null, x, 0.7, -0.3, line, stall)
  }

  // деревья: контурные конусы
  const cone = new THREE.ConeGeometry(0.6, 1.7, 7, 1, true)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + 0.25
    add(cone, null, Math.sin(angle) * 8.4, 0.85, Math.cos(angle) * 8.4, tree)
  }

  // земля: тонкая сетка
  const grid = new THREE.GridHelper(30, 60, 0x8a96c8, 0x4a5272)
  const gridMaterial = grid.material as THREE.Material
  gridMaterial.transparent = true
  gridMaterial.opacity = 0.35
  world.add(grid)

  return world
}

export default function ChorsuBazaar({ className }: { className?: string }) {
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
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120)
    scene.add(new THREE.AmbientLight(0x6070a0, 1.1))
    const sun = new THREE.DirectionalLight(0xdfe8ff, 2.4)
    sun.position.set(-7, 12, 9)
    scene.add(sun)
    const glow = new THREE.PointLight(0xffb866, 26, 12, 1.6)
    glow.position.set(0.4, 1.8, 3)
    scene.add(glow)

    const world = buildBazaar()
    scene.add(world)

    const mouse = { x: 0 }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const draw = (t: number) => {
      world.rotation.y = -0.2 + Math.sin(t * 0.22) * 0.45 + mouse.x * 0.18
      renderer.render(scene, camera)
    }

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // чем уже блок, тем дальше камера, чтобы площадь помещалась по ширине
      const k = Math.max(1, 1.4 / camera.aspect)
      camera.position.set(0, 10.5 * k, 22 * k)
      camera.lookAt(0, 2.5, 0)
      camera.updateProjectionMatrix()
      draw(performance.now() / 1000)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove)

    let visible = true
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(el)

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (visible) draw(performance.now() / 1000)
    }
    if (!reduced) tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      io.disconnect()
      ro.disconnect()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        ;(m.material as THREE.Material | undefined)?.dispose()
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className={className} aria-hidden />
}
