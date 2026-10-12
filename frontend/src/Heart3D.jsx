import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { riskColor } from './lib'
import { playBeat } from './heartbeat'

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

// Tube with a localized narrowing (illustrative stenosis). depth 0 = none, 0.7 = strong.
function narrowedTube(curve, segments, radius, radial, depth, center) {
  const g = new THREE.TubeGeometry(curve, segments, radius, radial, false)
  if (depth <= 0.001) return g
  const pos = g.attributes.position
  const c = new THREE.Vector3()
  const v = new THREE.Vector3()
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    const s = 1 - depth * Math.exp(-(((u - center) / 0.09) ** 2))
    curve.getPointAt(u, c)
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j
      v.fromBufferAttribute(pos, idx)
      v.sub(c).multiplyScalar(s).add(c)
      pos.setXYZ(idx, v.x, v.y, v.z)
    }
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
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

function Flesh({ color, xray, matRef }) {
  return (
    <meshPhysicalMaterial
      ref={matRef}
      color={color}
      emissive="#ff2a2a"
      emissiveIntensity={0}
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

// Light pulses sliding along an artery. Higher risk = slower flow.
function Flow({ curve, prob, count, radius, color, depth = 0, center = 0.4 }) {
  const ref = useRef()
  const phase = useRef(Math.random())
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const tan = useMemo(() => new THREE.Vector3(), [])
  const tint = useMemo(
    () => new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.6),
    [color]
  )
  const speed = 0.2 * (1 - 0.75 * prob)

  useFrame((_, delta) => {
    if (!ref.current) return
    phase.current = (phase.current + Math.min(delta, 0.1) * speed) % 1
    for (let i = 0; i < count; i++) {
      const u = (i / count + phase.current) % 1
      curve.getPointAt(u, dummy.position)
      curve.getTangentAt(u, tan)
      dummy.quaternion.setFromUnitVectors(up, tan)
      const sc = 1 - depth * Math.exp(-(((u - center) / 0.09) ** 2))
      dummy.scale.set(sc, 1, sc)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <cylinderGeometry args={[radius, radius, 0.09, 12]} />
      <meshBasicMaterial color={tint} transparent opacity={0.7} toneMapped={false} />
    </instancedMesh>
  )
}

// Pulsing warning ring around the narrowed spot of a high-risk artery
function Warn({ curve, at, radius }) {
  const ref = useRef()
  const mat = useRef()
  const { pos, quat } = useMemo(() => {
    const pos = curve.getPointAt(at, new THREE.Vector3())
    const tan = curve.getTangentAt(at, new THREE.Vector3())
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan)
    return { pos, quat }
  }, [curve, at])

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 1.4) / 1.4
    if (ref.current) ref.current.scale.setScalar(0.8 + 1.1 * t)
    if (mat.current) mat.current.opacity = 0.95 * (1 - t)
  })

  return (
    <mesh ref={ref} position={pos} quaternion={quat}>
      <torusGeometry args={[radius, 0.01, 8, 36]} />
      <meshBasicMaterial ref={mat} color="#ff4d4d" transparent opacity={0.9} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function Artery({ name, data, prob, selected, dim, onSelect }) {
  const color = prob == null ? '#888888' : riskColor(prob)
  const rMain = selected ? 0.062 : 0.045
  const rBr = selected ? 0.04 : 0.028
  const depth =
    prob == null ? 0 : Math.round(Math.min(1, Math.max(0, prob)) * 0.7 * 20) / 20

  const mainGeo = useMemo(
    () => narrowedTube(data.main, 120, rMain, 14, depth, data.stenosisAt),
    [data, rMain, depth]
  )
  const brGeos = useMemo(
    () => data.branches.map((c) => new THREE.TubeGeometry(c, 60, rBr, 10, false)),
    [data, rBr]
  )
  const hit = useMemo(() => new THREE.TubeGeometry(data.main, 40, 0.14, 8, false), [data])
  const labelPos = useMemo(() => data.main.getPoint(data.labelAt), [data])

  useEffect(() => () => mainGeo.dispose(), [mainGeo])
  useEffect(() => () => brGeos.forEach((g) => g.dispose()), [brGeos])

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
      transparent={dim}
      opacity={dim ? 0.22 : 1}
      depthWrite={!dim}
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

      {prob != null && !dim && (
        <>
          <Flow curve={data.main} prob={prob} count={6} radius={rMain * 1.12} color={color} depth={depth} center={data.stenosisAt} />
          {data.branches.map((c, i) => (
            <Flow key={i} curve={c} prob={prob} count={3} radius={rBr * 1.2} color={color} />
          ))}
        </>
      )}

      {prob != null && prob >= 0.66 && !dim && (
        <Warn curve={data.main} at={data.stenosisAt} radius={rMain * 1.9} />
      )}

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

function HeartModel({ preds, selected, onSelect, xray, bpm, soundOn, focus }) {
  const rig = useRef()
  const beat = useRef()
  const flesh = useRef()
  const phase = useRef(0)
  const ventGeo = useMemo(() => buildVentricles(), [])
  const arteries = useMemo(
    () => ({
      LAD: { main: makeCurve(LAD_MAIN), branches: LAD_BR.map((b) => makeCurve(b)), labelAt: 0.45, stenosisAt: 0.38 },
      LCX: { main: makeCurve(LCX_MAIN), branches: LCX_BR.map((b) => makeCurve(b)), labelAt: 0.55, stenosisAt: 0.45 },
      RCA: { main: makeCurve(RCA_MAIN), branches: RCA_BR.map((b) => makeCurve(b)), labelAt: 0.3, stenosisAt: 0.4 },
    }),
    []
  )
  const veinCurve = useMemo(() => makeCurve(VEIN, 0.02), [])

  // When an artery is selected, tell the camera rig where to look (world coordinates)
  useEffect(() => {
    const g = rig.current
    if (!g) return
    g.updateWorldMatrix(true, false)
    const a = selected ? arteries[selected] : null
    if (a) {
      const local = a.main.getPointAt(a.labelAt, new THREE.Vector3())
      const world = g.localToWorld(local)
      const center = g.localToWorld(new THREE.Vector3(0.1, 0.1, 0))
      focus.target.copy(world)
      focus.dir.copy(world).sub(center)
      focus.dir.y += 0.15
      focus.dir.normalize()
      focus.mode = 'focus'
    } else {
      focus.mode = 'home'
    }
    focus.active = true
    focus.t = 0
  }, [selected, arteries, focus])

  // lub-dub: two quick bumps per beat; speed follows bpm; sound fires at the start of each beat
  useFrame((state, delta) => {
    phase.current += Math.min(delta, 0.1) * (bpm / 60)
    if (phase.current >= 1) {
      phase.current -= 1
      if (soundOn) playBeat(60 / bpm)
    }
    const p = phase.current
    const b1 = Math.exp(-(((p - 0.06) / 0.05) ** 2))
    const b2 = Math.exp(-(((p - 0.3) / 0.06) ** 2))
    if (beat.current) beat.current.scale.setScalar(1 + 0.04 * b1 + 0.028 * b2)
    if (flesh.current) flesh.current.emissiveIntensity = 0.3 * (b1 + 0.7 * b2)
  })

  return (
    <group position={[0, -0.34, 0]} scale={0.8}>
      <group ref={rig} rotation={[0.08, -0.35, 0]}>
        <group ref={beat}>
          <mesh geometry={ventGeo}>
            <Flesh color="#d9a79c" xray={xray} matRef={flesh} />
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
              dim={selected != null && selected !== name}
              onSelect={onSelect}
            />
          ))}
        </group>
      </group>
    </group>
  )
}

// Smoothly flies the camera to the selected artery (and back home when nothing is selected)
function CameraRig({ focus, ctrlRef }) {
  const { camera } = useThree()
  const want = useMemo(() => new THREE.Vector3(), [])
  const homePos = useMemo(() => new THREE.Vector3(0, 0.2, 5.2), [])
  const homeTgt = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useFrame((_, delta) => {
    const c = ctrlRef.current
    if (!c || !focus.active) return
    focus.t += delta
    const k = 1 - Math.exp(-delta * 4)
    let tgt = homeTgt
    if (focus.mode === 'focus') {
      tgt = focus.target
      want.copy(focus.target).addScaledVector(focus.dir, focus.distance)
    } else {
      want.copy(homePos)
    }
    c.target.lerp(tgt, k)
    camera.position.lerp(want, k)
    c.update()
    if (focus.t > 1.8) focus.active = false
  })
  return null
}

function Controls({ autoRotate, resetSignal, ctrlRef }) {
  useEffect(() => {
    if (ctrlRef.current) ctrlRef.current.reset()
  }, [resetSignal, ctrlRef])
  return (
    <OrbitControls
      ref={ctrlRef}
      enablePan={false}
      enableDamping
      autoRotate={autoRotate}
      autoRotateSpeed={1.4}
      minDistance={2.5}
      maxDistance={9}
    />
  )
}

export default function Heart3D({
  preds,
  selected,
  onSelect,
  autoRotate,
  xray,
  resetSignal,
  bpm = 72,
  soundOn = false,
}) {
  const ctrlRef = useRef()
  const focus = useMemo(
    () => ({
      target: new THREE.Vector3(),
      dir: new THREE.Vector3(0, 0, 1),
      distance: 3,
      mode: 'home',
      active: false,
      t: 0,
    }),
    []
  )

  return (
    <Canvas
      camera={{ position: [0, 0.2, 5.2], fov: 40 }}
      dpr={[1, 1.75]}
      onPointerMissed={() => onSelect(null)}
    >
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#ffffff', '#444455', 0.5]} />
      <directionalLight position={[4, 5, 5]} intensity={1.6} />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} />
      <HeartModel
        preds={preds}
        selected={selected}
        onSelect={onSelect}
        xray={xray}
        bpm={bpm}
        soundOn={soundOn}
        focus={focus}
      />
      <Controls autoRotate={autoRotate} resetSignal={resetSignal} ctrlRef={ctrlRef} />
      <CameraRig focus={focus} ctrlRef={ctrlRef} />
    </Canvas>
  )
}
