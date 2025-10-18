import React, { useRef, useEffect, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Minimal GLTF type for loader callback
type GLTF = { scene: THREE.Group }
import { OrbitControls } from '@react-three/drei'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

const ChessScene: React.FC = () => {
  const chessboardRef = useRef<THREE.Group>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null!)
  const { camera } = useThree()
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Add keyboard event listener for capturing camera position
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'l') {
        // Capture and print camera position and target
        const position = camera.position.clone();
        const target = new THREE.Vector3(0, 0, 0);
        if (controlsRef.current) {
          target.copy(controlsRef.current.target);
        }
        
        console.log('Camera position captured:');
        console.log(`Position: { x: ${position.x.toFixed(2)}, y: ${position.y.toFixed(2)}, z: ${position.z.toFixed(2)} }`);
        console.log(`LookAt: { x: ${target.x.toFixed(2)}, y: ${target.y.toFixed(2)}, z: ${target.z.toFixed(2)} }`);
        
        // If chessboard is loaded, also log its rotation
        if (chessboardRef.current) {
          const rotation = chessboardRef.current.rotation;
          console.log(`Chessboard rotation: { x: ${rotation.x.toFixed(2)}, y: ${rotation.y.toFixed(2)}, z: ${rotation.z.toFixed(2)} }`);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [camera])

  useEffect(() => {
    // Load the full chessboard with pieces
    const loader = new GLTFLoader()
  loader.load(
    '/3D Models/Chess Pawns/cHESS_bOARD.glb',
    (gltf: GLTF) => {
      const model = gltf.scene
      model.scale.set(100, 100, 100) // Smaller scale for closer viewing
      // Rotate to face the front view
      model.rotation.y = 0.00 // Precise captured rotation value
      // Create crystal material for all pieces and board
      model.traverse((node: any) => {
        if (node.isMesh && node.material) {
          const color = node.material.color?.getHex() || 0
          const isWhite = color > 0x888888
          node.material = new THREE.MeshPhysicalMaterial({
            color: isWhite ? 0xf0f0f5 : 0x101018,
            metalness: 0.2,
            roughness: 0.1,
            transmission: 0.9, // Make it transparent
            thickness: 0.5, // Glass thickness
            envMapIntensity: 1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1,
            transparent: true,
            opacity: isWhite ? 0.7 : 0.6 // Slightly different opacity for contrast
          })
          node.castShadow = true
          node.receiveShadow = true
        }
      })
      if (chessboardRef.current) {
        chessboardRef.current.add(model)
        setIsLoaded(true)
      }
    },
    undefined,
    (error: any) => {
      console.error('Error loading GLB:', error)
    }
  )

    // Position camera starting far from the board
    camera.position.set(200, 300, 200) // Start from farther away
    camera.lookAt(0, 0, 0) // Look at the board center initially

  }, [camera])

  useEffect(() => {
    if (isLoaded) {
      // Animation moving towards the exact captured camera position
      let startTime = Date.now()
      const animate = () => {
        const t = Math.min((Date.now() - startTime) / 5000, 1) // Slower animation (5 seconds)
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

        // Start position
        const startPos = new THREE.Vector3(200, 300, 200)
        
        // End position - exactly as captured coordinates
        const endPos = new THREE.Vector3(-9.88, 13.85, -13.91)
        
        // Look target - exactly as captured
        const startLookAt = new THREE.Vector3(0, 0, 0)
        const endLookAt = new THREE.Vector3(-7.43, -30.92, 75.47)

        if (t >= 1) {
          // Hard-set the position and lookAt to ensure absolute precision
          camera.position.set(-9.88, 13.85, -13.91);
          camera.lookAt(-7.43, -30.92, 75.47);
          
          if (controlsRef.current) {
            controlsRef.current.target.set(-7.43, -30.92, 75.47);
          }
          
          // Also ensure the model rotation is exactly as specified
          if (chessboardRef.current) {
            chessboardRef.current.rotation.set(0, 0, 0);
          }
          
          // Animation complete, no need to continue
          return;
        } else {
          // Use interpolation during animation
          const newPos = startPos.clone().lerp(endPos, easeT)
          camera.position.copy(newPos)

          const newLookAt = startLookAt.clone().lerp(endLookAt, easeT)
          camera.lookAt(newLookAt)

          if (controlsRef.current) {
            controlsRef.current.target.copy(newLookAt);
          }
          requestAnimationFrame(animate)
        }
      }
      animate()
    }
  }, [isLoaded, camera])

  // Removed all continuous animation to keep the board completely still
  // No more floating, tilting or rotation

  return (
    <>
      {/* Enhanced lighting for crystal model */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[100, 500, 100]}
        intensity={1.5}
        castShadow
      />
      <spotLight
        position={[-100, 500, -100]}
        intensity={1.5}
        angle={Math.PI / 4}
        penumbra={0.3}
        castShadow
      />

      {/* Crystal model container with reflection plane */}
      <group ref={chessboardRef} />

      {/* Reflective floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -50, 0]} receiveShadow>
        <circleGeometry args={[2000, 128]} />
        <meshPhysicalMaterial
          color={0x222222}
          metalness={0.9}
          roughness={0.05}
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          reflectivity={1}
        />
      </mesh>

      {/* Environment lighting for better crystal effect */}
      <hemisphereLight
        intensity={0.5}
        groundColor={new THREE.Color(0x000066)}
        color={new THREE.Color(0xffffff)}
      />

      {/* Orbit controls: only allow panning with right mouse button */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        enableRotate={true}
        enableZoom={true}
        enablePan={true}
        mouseButtons={{ LEFT: 0, MIDDLE: 1, RIGHT: 2 }}
      />
    </>
  )
}

export default ChessScene