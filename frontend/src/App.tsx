import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { Mesh } from 'three'

function SpinningCube() {
  const ref = useRef<Mesh>(null!)
  useFrame((_, delta) => {
    ref.current.rotation.y += delta
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="royalblue" />
    </mesh>
  )
}

export default function App() {
  return (
    <div className="w-screen h-screen bg-gray-900">
      <Canvas camera={{ position: [3, 3, 3] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <SpinningCube />
        <OrbitControls />
        <gridHelper args={[10, 10]} />
      </Canvas>
    </div>
  )
}
