import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * Неподвижный пол из сетки в перспективе (фон блока с призывом внизу главной).
 * Рисуется один раз и перерисовывается только при изменении размера блока.
 */
export default function GridFloor3D({ className }: { className?: string }) {
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
      // чем уже блок, тем дальше камера, чтобы сетка выглядела одинаково
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
