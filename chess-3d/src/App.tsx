import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { useState, useRef } from 'react'
import ChessScene from './scenes/ChessScene'
import './App.css'

function App() {
  const [showIntroduction, setShowIntroduction] = useState(false);
  const resetCameraRef = useRef<(() => void) | null>(null);

  // Function to handle king click
  const handleKingClick = (resetCameraFn: () => void) => {
    setShowIntroduction(true);
    // Store the reset camera function for later use
    resetCameraRef.current = resetCameraFn;
  };

  // Function to close the introduction overlay and reset camera
  const closeIntroduction = () => {
    setShowIntroduction(false);
    
    // Reset camera position if available
    if (resetCameraRef.current) {
      setTimeout(() => {
        resetCameraRef.current?.();
      }, 100); // Small delay to ensure UI updates first
    }
  };
  
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
        <ChessScene onKingClick={handleKingClick} />
      </Canvas>
      
      {/* Introduction Overlay - Rendered outside the Canvas */}
      {showIntroduction && (
        <div className="introduction-overlay">
          <div className="introduction-content">
            <h1>Welcome to Fortimark</h1>
            <p>Discover the strategic world of financial solutions with Fortimark.</p>
            <p>Our expert team provides innovative strategies to protect and grow your assets.</p>
            <p>Like chess, financial planning requires strategy, foresight, and expert guidance.</p>
            <button className="close-button" onClick={closeIntroduction}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App