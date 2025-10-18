import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import ChessScene from './scenes/ChessScene'
import './App.css'

function App() {
  return (
    <div className="app">
      <Canvas
        camera={{
          position: [200, 300, 200],
          fov: 40, // Slightly wider FOV to see more from distance
          near: 1,
          far: 5000,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <ChessScene />
      </Canvas>
    </div>
  )
}

export default App