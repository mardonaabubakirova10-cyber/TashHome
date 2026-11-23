import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { scrollProgress } from '../lib/scrollProgress'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

type Part = {
  group: THREE.Group // поворот и рост от земли
  fill: THREE.MeshStandardMaterial
  kind: 'body' | 'slab' | 'glass'
  delay: number
  fillColor: number
}

/**
 * 3D-дом, который «строится» по мере прокрутки блока: сначала только контуры (чертёж),
 * потом вырастают объёмы и появляются окна, в конце дом заливается цветом, и в окнах загорается тёплый свет.
 */
export default function HouseBuild3D({ className }: { className?: string }) {
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
    camera.position.set(8.2, 5.4, 12)
    camera.lookAt(0, 1.6, 0)

    scene.add(new THREE.AmbientLight(0x6070a0, 1.1))
    const sun = new THREE.DirectionalLight(0xdfe8ff, 2.4)
    sun.position.set(-4, 7, 6)
    scene.add(sun)
    const warm = new THREE.PointLight(0xffb866, 0, 12, 1.6)
    warm.position.set(0.4, 1.6, 1.2)
    scene.add(warm)

    const world = new THREE.Group()
    scene.add(world)

    // земля: тонкая сетка
    const grid = new THREE.GridHelper(16, 32, 0x8a96c8, 0x4a5272)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.35
    world.add(grid)

    const disposables: Array<{ dispose(): void }> = []
    const parts: Part[] = []
    const lineMats: THREE.LineBasicMaterial[] = []
    const boxGeo = new THREE.BoxGeometry(1, 1, 1)
    const edgeGeo = new THREE.EdgesGeometry(boxGeo)
    disposables.push(boxGeo, edgeGeo)

    /** Параллелепипед с контуром. Рост идёт от основания (низа), поэтому внутри отдельная группа со сдвигом. */
    const addBox = (
      kind: Part['kind'],
      [w, h, d]: [number, number, number],
      [x, y, z]: [number, number, number],
      fillColor: number,
      delay: number,
    ) => {
      const group = new THREE.Group()
      group.position.set(x, y - h / 2, z) // основание на высоте y - h/2
      const inner = new THREE.Group()
      inner.position.y = h / 2
      const fill = new THREE.MeshStandardMaterial({
        color: fillColor,
        transparent: true,
        opacity: 0,
        metalness: 0.2,
        roughness: 0.55,
        emissive: kind === 'glass' ? 0xffb866 : 0x000000,
        emissiveIntensity: 0,
        depthWrite: kind !== 'glass',
      })
      const mesh = new THREE.Mesh(boxGeo, fill)
      mesh.scale.set(w, h, d)
      const lineMat = new THREE.LineBasicMaterial({ color: kind === 'glass' ? 0x9fb4ff : 0xeaf0ff, transparent: true, opacity: 0.9 })
      const lines = new THREE.LineSegments(edgeGeo, lineMat)
      lines.scale.set(w, h, d)
      inner.add(mesh, lines)
      group.add(inner)
      world.add(group)
      disposables.push(fill, lineMat)
      lineMats.push(lineMat)
      parts.push({ group, fill, kind, delay, fillColor })
    }

    // два объёма и плоские крыши-козырьки
    addBox('body', [3.2, 3.4, 3], [-1.5, 3.4, 0], 0x56627f, 0.0)
    addBox('body', [3.1, 2.1, 2.7], [1.55, 2.1, 0.15], 0x66739a, 0.08)
    addBox('slab', [3.7, 0.16, 3.5], [-1.5, 3.56, 0], 0x8794b8, 0.2)
    addBox('slab', [3.5, 0.16, 3.1], [1.55, 2.26, 0.15], 0x8794b8, 0.26)
    // окна на фасаде (по z+)
    ;[-2.5, -1.5, -0.5].forEach((x, i) => {
      addBox('glass', [0.72, 1.0, 0.08], [x, 2.75, 1.52], 0x16304e, 0.45 + i * 0.04)
      addBox('glass', [0.72, 0.9, 0.08], [x, 1.15, 1.52], 0x16304e, 0.5 + i * 0.04)
    })
    addBox('glass', [1.9, 1.3, 0.08], [1.6, 1.15, 1.52], 0x16304e, 0.62)
    addBox('glass', [0.5, 1.1, 0.08], [3.0, 0.65, 1.52], 0x16304e, 0.66)

    // деревья: контурные конусы, появляются на последней стадии
    const treeMat = new THREE.LineBasicMaterial({ color: 0xb8c6ff, transparent: true, opacity: 0 })
    const coneGeo = new THREE.ConeGeometry(0.55, 1.5, 7, 1, true)
    const coneEdges = new THREE.EdgesGeometry(coneGeo)
    disposables.push(treeMat, coneGeo, coneEdges)
    const trees: THREE.Object3D[] = []
    ;[[-4.2, 1.6], [4.6, 2.2], [-3.6, -1.8], [5.0, -1.2]].forEach(([x, z]) => {
      const t = new THREE.LineSegments(coneEdges, treeMat)
      t.position.set(x, 1.1, z)
      t.scale.setScalar(0)
      world.add(t)
      trees.push(t)
    })

    // для статичного режима и пока идёт загрузка
    let progress = 0
    let shown = 0

    const apply = (p: number) => {
      for (const part of parts) {
        // рост от земли
        const grow = smooth(part.delay, part.delay + 0.3, p)
        const sy = part.kind === 'glass' ? 1 : Math.max(grow, 0.001)
        part.group.scale.set(1, sy, 1)
        const visible = part.kind === 'glass' ? grow : 1
        part.group.visible = visible > 0.001
        // заливка цветом на последней стадии
        const fillAmt = smooth(0.62, 0.95, p)
        part.fill.opacity = part.kind === 'glass' ? 0.25 + fillAmt * 0.55 : fillAmt * 0.92
        // тёплый свет в окнах
        if (part.kind === 'glass') part.fill.emissiveIntensity = smooth(0.7, 1, p) * 1.1
      }
      const lineAmt = 0.35 + smooth(0, 0.25, p) * 0.65
      lineMats.forEach((m) => (m.opacity = lineAmt))
      const treeAmt = smooth(0.55, 0.9, p)
      treeMat.opacity = treeAmt * 0.8
      trees.forEach((t) => t.scale.setScalar(treeAmt))
      warm.intensity = smooth(0.72, 1, p) * 26
    }
    apply(0)

    const resize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      camera.position.set(8.2, 5.4, 12)
      if (w / h < 1) camera.position.multiplyScalar(1.3) // на узком экране отодвигаем камеру
      camera.lookAt(0, 1.6, 0)
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el)

    const mouse = { x: 0 }
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let visible = true
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
    })
    io.observe(el)

    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible) return
      progress = scrollProgress(el)
      shown += (progress - shown) * 0.08 // плавно догоняем прокрутку
      apply(shown)
      const t = (performance.now() - t0) / 1000
      world.rotation.y = -0.45 + Math.sin(t * 0.25) * 0.3 + mouse.x * 0.18
      renderer.render(scene, camera)
    }
    if (reduced) {
      apply(1)
      world.rotation.y = -0.45
      renderer.render(scene, camera)
    } else {
      tick()
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      io.disconnect()
      ro.disconnect()
      disposables.forEach((d) => d.dispose())
      grid.geometry.dispose()
      ;(grid.material as THREE.Material).dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className={className} aria-hidden />
}
