import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { riskColor } from './lib'

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const gauss = (x, s2) => Math.exp(-(x * x) / s2)

// Ventricle surface: phi = angle around (0 = front, + = patient's left), ny = height (-1 apex ... 1 top)
function shape(phi, ny, out = new THREE.Vector3()) {
  ny = Math.max(-1, Math.min(1, ny))
  const r = Math.sqrt(Math.max(0, 1 - ny * ny))
  const ux = r * Math.sin(phi)
  const uz = r * Math.cos(phi)

  let c = 0.5 + 0.5 * smooth(-1, 0.5, ny)
  const phiG = 0.25 - 0.3 * ny
  const d = Math.atan2(Math.sin(phi - phiG), Math.cos(phi - phiG))
  c *= 1 - 0.09 * gauss(d, 0.03) // interventricular groove
  c *= 1 - 0.05 * gauss(ny - 0.5, 0.012) // AV groove

  let x = ux * 0.92 * c
  let z = uz * 0.72 * c
  if (uz < 0) z *= 0.85
  const y = ny * 1.15
  x += 0.4 * Math.pow((1 - ny) / 2, 2) // apex tilts to patient's left
  return out.set(x, y, z)
}

function normalAt(phi, ny) {
  const n0 = Math.max(-0.96, Math.min(0.96, ny))
  const e = 0.02
  const a = shape(phi + e, n0)
  const b = shape(phi - e, n0)
  const c = shape(phi, n0 + e)
  const d = shape(phi, n0 - e)
  return new THREE.Vector3().crossVectors(a.sub(b), c.sub(d)).normalize()
}

function buildVentricles() {
  const g = new THREE.SphereGeometry(1, 96, 72)
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  const p = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    shape(Math.atan2(v.x, v.z), v.y, p)
    pos.setXYZ(i, p.x, p.y, p.z)
  }
  g.deleteAttribute('normal')
  g.deleteAttribute('uv')
  const m = mergeVertices(g, 1e-4)
  m.computeVertexNormals()
  return m
}

function makeCurve(points, offset = 0.025) {
  const pts = points.map(([phi, ny]) =>
    shape(phi, ny).add(normalAt(phi, ny).multiplyScalar(offset))
  )
  return new THREE.CatmullRomCurve3(pts)
}

// ---------- Coronary paths in (phi, ny) space ----------
const grooveAt = (ny) => 0.25 - 0.3 * ny

const LAD_MAIN = [0.5, 0.35, 0.15, -0.05, -0.25, -0.45, -0.65, -0.82, -0.93].map((ny) => [
  grooveAt(ny),
  ny,
])
const LAD_BR = [
  [[0.2, 0.15], [0.45, 0.05], [0.7, -0.1], [0.9, -0.28]],
  [[0.34, -0.3], [0.62, -0.42], [0.85, -0.58]],
]
const LCX_MAIN = [[0.1, 0.5], [0.45, 0.5], [0.9, 0.47], [1.35, 0.45], [1.8, 0.42], [2.2, 0.4], [2.5, 0.38]]
const LCX_BR = [[[1.3, 0.45], [1.36, 0.2], [1.42, -0.1], [1.48, -0.4], [1.52, -0.65]]]
const RCA_MAIN = [
  [-0.15, 0.52], [-0.5, 0.5], [-0.95, 0.46], [-1.4, 0.42], [-1.85, 0.38],
  [-2.3, 0.33], [-2.75, 0.27], [-3.1, 0.2], [-3.14, 0.0], [-3.14, -0.3], [-3.14, -0.6],
]
const RCA_BR = [[[-1.2, 0.44], [-1.25, 0.15], [-1.3, -0.2], [-1.35, -0.55], [-1.4, -0.8]]]
const VEIN = [0.45, 0.3, 0.1, -0.1, -0.3, -0.5, -0.7].map((ny) => [grooveAt(ny) + 0.09, ny])

// ---------- Great vessels (x, y, z) ----------
const AORTA = [[-0.1, 0.9, 0], [-0.1, 1.4, 0], [0.05, 1.8, -0.1], [0.45, 2.0, -0.25], [0.85, 1.8, -0.35], [0.95, 1.3, -0.5]]
const PULM = [[0.2, 0.9, 0.35], [0.22, 1.3, 0.33], [0.3, 1.62, 0.2]]
const PULM_L = [[0.3, 1.62, 0.2], [0.7, 1.75, 0], [1.1, 1.7, -0.2]]
const PULM_R = [[0.3, 1.62, 0.2], [-0.1, 1.72, -0.2], [-0.65, 1.72, -0.4]]
const SVC = [[-0.7, 0.9, -0.2], [-0.72, 1.5, -0.2], [-0.72, 1.95, -0.2]]
const IVC = [[-0.65, 0.3, -0.3], [-0.68, -0.4, -0.35]]
const PV1 = [[0.6, 0.9, -0.6], [1.1, 1.0, -0.65]]
const PV2 = [[0.6, 1.05, -0.5], [1.1, 1.3, -0.5]]

function Flesh({ color, xray }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.55}
      clearcoat={0.3}
      clearcoatRoughness={0.6}
      side={THREE.DoubleSide}
      transparent={xray}
      opacity={xray ? 0.3 : 1}
      depthWrite={!xray}
    />
  )
}

function Blob({ position, scale, rotation = [0, 0, 0], color, xray }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation}>
      <sphereGeometry args={[1, 40, 28]} />
      <Flesh color={color} xray={xray} />
    </mesh>
  )
}

function Vessel({ points, radius, color }) {
  const geo = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        48,
        radius,
        20,
        false
      ),
    [points, radius]
  )
  return (
    <mesh geometry={geo}>
      <meshPhysicalMaterial color={color} roughness={0.45} clearcoat={0.3} />
    </mesh>
  )
}

function Vein({ curve }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 60, 0.02, 10, false), [curve])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#4a63a6" roughness={0.5} />
    </mesh>
  )
}

function Artery({ name, data, prob, selected, onSelect }) {
  const color = prob == null ? '#888888' : riskColor(prob)
  const rMain = selected ? 0.062 : 0.045
  const rBr = selected ? 0.04 : 0.028

  const mainGeo = useMemo(() => new THREE.TubeGeometry(data.main, 120, rMain, 14, false), [data, rMain])
  const brGeos = useMemo(
    () => data.branches.map((c) => new THREE.TubeGeometry(c, 60, rBr, 10, false)),
    [data, rBr]
  )
  const hit = useMemo(() => new THREE.TubeGeometry(data.main, 40, 0.14, 8, false), [data])
  const labelPos = useMemo(() => data.main.getPoint(data.labelAt), [data])

  const over = (e) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  }
  const out = () => {
    document.body.style.cursor = 'auto'
  }

  const mat = (
    <meshStandardMaterial
      color={color}
      roughness={0.35}
      emissive={color}
      emissiveIntensity={selected ? 0.7 : 0.2}
    />
  )

  return (
    <group>
      <mesh geometry={mainGeo}>{mat}</mesh>
      {brGeos.map((g, i) => (
        <mesh key={i} geometry={g}>
          {mat}
        </mesh>
      ))}
      <mesh
        geometry={hit}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(name)
        }}
        onPointerOver={over}
        onPointerOut={out}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={labelPos} center distanceFactor={4} style={{ pointerEvents: 'none' }}>
        <div className={`art-label ${selected ? 'sel' : ''}`}>
          {name}
          {prob != null ? ` ${Math.round(prob * 100)}%` : ''}
        </div>
      </Html>
    </group>
  )
}

function HeartModel({ preds, selected, onSelect, xray }) {
  const beat = useRef()
  const ventGeo = useMemo(() => buildVentricles(), [])
  const arteries = useMemo(
    () => ({
      LAD: { main: makeCurve(LAD_MAIN), branches: LAD_BR.map((b) => makeCurve(b)), labelAt: 0.45 },
      LCX: { main: makeCurve(LCX_MAIN), branches: LCX_BR.map((b) => makeCurve(b)), labelAt: 0.55 },
      RCA: { main: makeCurve(RCA_MAIN), branches: RCA_BR.map((b) => makeCurve(b)), labelAt: 0.3 },
    }),
    []
  )
  const veinCurve = useMemo(() => makeCurve(VEIN, 0.02), [])

  useFrame(({ clock }) => {
    if (beat.current) {
      beat.current.scale.setScalar(1 + 0.012 * Math.sin(clock.elapsedTime * 2.2))
    }
  })

  return (
    <group position={[0, -0.34, 0]} scale={0.8}>
      <group rotation={[0.08, -0.35, 0]}>
        <group ref={beat}>
          <mesh geometry={ventGeo}>
            <Flesh color="#d9a79c" xray={xray} />
          </mesh>

          {/* Atria + auricles */}
          <Blob position={[-0.7, 0.78, -0.35]} scale={[0.38, 0.48, 0.36]} color="#c98e84" xray={xray} />
          <Blob position={[0.4, 0.9, -0.55]} scale={[0.5, 0.38, 0.38]} color="#c98e84" xray={xray} />
          <Blob position={[-0.35, 0.95, 0.4]} scale={[0.3, 0.22, 0.2]} rotation={[0, 0, 0.5]} color="#c98e84" xray={xray} />
          <Blob position={[0.62, 0.9, 0.35]} scale={[0.22, 0.27, 0.18]} rotation={[0, 0, -0.4]} color="#c98e84" xray={xray} />

          {/* Great vessels */}
          <Vessel points={AORTA} radius={0.2} color="#b8564f" />
          <Vessel points={PULM} radius={0.17} color="#6f7fa8" />
          <Vessel points={PULM_L} radius={0.12} color="#6f7fa8" />
          <Vessel points={PULM_R} radius={0.12} color="#6f7fa8" />
          <Vessel points={SVC} radius={0.15} color="#5b6fa0" />
          <Vessel points={IVC} radius={0.15} color="#5b6fa0" />
          <Vessel points={PV1} radius={0.07} color="#b8564f" />
          <Vessel points={PV2} radius={0.07} color="#b8564f" />

          <Vein curve={veinCurve} />

          {Object.entries(arteries).map(([name, data]) => (
            <Artery
              key={name}
              name={name}
              data={data}
              prob={preds?.[name]?.probability ?? null}
              selected={selected === name}
              onSelect={onSelect}
            />
          ))}
        </group>
      </group>
    </group>
  )
}

function Controls({ autoRotate, resetSignal }) {
  const ref = useRef()
  useEffect(() => {
    if (ref.current) ref.current.reset()
  }, [resetSignal])
  return (
    <OrbitControls
      ref={ref}
      enablePan={false}
      enableDamping
      autoRotate={autoRotate}
      autoRotateSpeed={1.4}
      minDistance={2.5}
      maxDistance={9}
    />
  )
}

export default function Heart3D({ preds, selected, onSelect, autoRotate, xray, resetSignal }) {
  return (
    <Canvas
      camera={{ position: [0, 0.2, 5.2], fov: 40 }}
      dpr={[1, 1.75]}
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#ffffff', '#444455', 0.5]} />
      <directionalLight position={[4, 5, 5]} intensity={1.6} />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} />
      <HeartModel preds={preds} selected={selected} onSelect={onSelect} xray={xray} />
      <Controls autoRotate={autoRotate} resetSignal={resetSignal} />
    </Canvas>
  )
}