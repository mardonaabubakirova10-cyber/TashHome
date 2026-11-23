import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Неподвижный 3D-чертёж: два дома в проволочном виде (только рёбра и еле заметная заливка) на сетке-полу.
 * Рисуется один раз и перерисовывается только при изменении размера блока. Анимации и реакции на мышь нет.
 */
export default function HouseBlueprint3D({ className }: { className?: string }) {
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
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120)

    const disposables: Array<{ dispose(): void }> = []
    const boxGeo = new THREE.BoxGeometry(1, 1, 1)
    const edgeGeo = new THREE.EdgesGeometry(boxGeo)
    const wallLine = new THREE.LineBasicMaterial({ color: 0xeaf0ff, transparent: true, opacity: 0.95 })
    const glassLine = new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: 0.9 })
    const fill = new THREE.MeshBasicMaterial({ color: 0x6f7fb5, transparent: true, opacity: 0.07, depthWrite: false })
    const coneGeo = new THREE.ConeGeometry(0.55, 1.5, 7, 1, true)
    const coneEdges = new THREE.EdgesGeometry(coneGeo)
    const treeLine = new THREE.LineBasicMaterial({ color: 0xb8c6ff, transparent: true, opacity: 0.8 })
    disposables.push(boxGeo, edgeGeo, wallLine, glassLine, fill, coneGeo, coneEdges, treeLine)

    /** Один дом: два объёма, плоские крыши-козырьки, окна на фасаде и деревья по бокам. */
    const makeHouse = () => {
      const house = new THREE.Group()
      const box = (size: [number, number, number], pos: [number, number, number], glass = false) => {
        const m = new THREE.Mesh(boxGeo, fill)
        m.scale.set(...size)
        m.position.set(...pos)
        const l = new THREE.LineSegments(edgeGeo, glass ? glassLine : wallLine)
        m.add(l) // линии наследуют масштаб и позицию куба
        house.add(m)
      }
      box([3.2, 3.4, 3], [-1.5, 1.7, 0])
      box([3.1, 2.1, 2.7], [1.55, 1.05, 0.15])
      box([3.7, 0.16, 3.5], [-1.5, 3.48, 0])
      box([3.5, 0.16, 3.1], [1.55, 2.18, 0.15])
      ;[-2.5, -1.5, -0.5].forEach((x) => {
        box([0.72, 1.0, 0.08], [x, 2.75, 1.52], true)
        box([0.72, 0.9, 0.08], [x, 1.15, 1.52], true)
      })
      box([1.9, 1.3, 0.08], [1.6, 1.15, 1.52], true)
      box([0.5, 1.1, 0.08], [3.0, 0.65, 1.52], true)
      ;[[-4.2, 1.6], [4.6, 2.2], [-3.6, -1.8], [5.0, -1.2]].forEach(([x, z]) => {
        const t = new THREE.LineSegments(coneEdges, treeLine)
        t.position.set(x, 0.75, z)
        house.add(t)
      })
      return house
    }

    const left = makeHouse()
    left.position.x = -8.2
    left.rotation.y = 0.55
    const right = makeHouse()
    right.position.x = 8.6
    right.rotation.y = -0.5
    right.scale.setScalar(0.92)
    scene.add(left, right)

    // сетка-пол во всю ширину сцены
    const grid = new THREE.GridHelper(70, 140, 0x8a96c8, 0x4a5272)
    const gridMat = grid.material as THREE.Material
    gridMat.transparent = true
    gridMat.opacity = 0.4
    scene.add(grid)
    disposables.push(grid.geometry, gridMat)

    const render = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      camera.aspect = w / h
      // чем уже блок, тем дальше камера, чтобы оба дома помещались
      const k = w / h < 3 ? 3 / (w / h) : 1
      camera.position.set(0, 5 * k, 15.6 * k)
      camera.lookAt(0, 1.5, 0)
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    }
    render()
    const ro = new ResizeObserver(render)
    ro.observe(el)

    return () => {
      ro.disconnect()
      disposables.forEach((d) => d.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={host} className={className} aria-hidden />
}
