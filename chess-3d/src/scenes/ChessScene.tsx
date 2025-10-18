import React, { useRef, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

// Minimal GLTF type for loader callback
type GLTF = { scene: THREE.Group }
import { OrbitControls } from '@react-three/drei'

const ChessScene: React.FC = () => {
  const chessboardRef = useRef<THREE.Group>(null)
  const { camera } = useThree()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Load the full chessboard with pieces
    const loader = new GLTFLoader()
  loader.load(
    '/3D Models/Chess Pawns/cHESS_bOARD.glb',
    (gltf: GLTF) => {
      const model = gltf.scene
      model.scale.set(100, 100, 100) // Smaller scale for closer viewing
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
    (error) => {
      console.error('Error loading GLB:', error)
    }
  )

    // Position camera starting far from the board
    camera.position.set(200, 300, 200) // Start from farther away
    camera.lookAt(0, 0, 0) // Look at the board center initially

  }, [camera])

  useEffect(() => {
    if (isLoaded) {
      // Animation moving towards the board
      let startTime = Date.now()
      const animate = () => {
        const t = Math.min((Date.now() - startTime) / 5000, 1) // Slower animation (5 seconds)
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

        // Move from far to close
        const height = 300 - (250 * easeT) // Move down from 300 to 50
        const radius = 200 - (150 * easeT) // Spiral inward from 200 to 50
        const angle = easeT * Math.PI * 2 // Full rotation while moving in

        camera.position.set(
          Math.sin(angle) * radius,
          height,
          Math.cos(angle) * radius
        )
        // Gradually look up at the pieces as we get closer
        camera.lookAt(0, easeT * 30, 0) // Start at board level, move up to pieces

        if (t < 1) {
          requestAnimationFrame(animate)
        }
      }
      animate()
    }
  }, [isLoaded, camera])

  // More intimate floating animation
  useFrame((state, delta) => {
    if (chessboardRef.current && isLoaded) {
      // Subtle floating motion that's more noticeable up close
      const time = state.clock.getElapsedTime()
      chessboardRef.current.position.y = Math.sin(time * 0.2) * 5 // Very gentle float
      // Add a slight tilt animation
      chessboardRef.current.rotation.x = Math.sin(time * 0.15) * 0.02 // Subtle tilt
      chessboardRef.current.rotation.y += delta * 0.03 // Very slow rotation
    }
  })

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