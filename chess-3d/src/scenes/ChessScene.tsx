import React, { useRef, useEffect, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PerspectiveCamera } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Minimal GLTF type for loader callback
type GLTF = { scene: THREE.Group }
import { OrbitControls } from '@react-three/drei'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// Interface for chess pieces with hover state
interface ChessPiece extends THREE.Object3D {
  isChessPiece?: boolean;
  pieceType?: string; // Add piece type identification (king, queen, etc.)
  originalPosition?: THREE.Vector3;
  material?: THREE.Material;
}

interface ChessSceneProps {
  onKingClick?: (resetCameraFn: () => void) => void;
}

const ChessScene: React.FC<ChessSceneProps> = ({ onKingClick }) => {
  const chessboardRef = useRef<THREE.Group>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null!)
  const [raycaster] = useState(() => new THREE.Raycaster())
  const [mouse] = useState(() => new THREE.Vector2())
  const { camera } = useThree()
  const [isLoaded, setIsLoaded] = useState(false)
  const [hoveredPiece, setHoveredPiece] = useState<ChessPiece | null>(null)
  const [isKingSelected, setIsKingSelected] = useState(false)
  
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
  }, [camera]);
  
  // Set up mouse move and click handlers for hover detection and interaction
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    
    const handleMouseClick = (event: MouseEvent) => {
      if (isKingSelected) return // Block clicks when zoomed in

      // Use same coordinates as mouse move
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update raycaster and check for intersections
      if (isLoaded && chessboardRef.current) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(chessboardRef.current.children, true);

        // Check if we clicked on a king piece
        const clickedKing = intersects.map(i => i.object).find(obj => {
          const piece = obj as ChessPiece;
          return piece.isChessPiece && piece.pieceType === 'king';
        }) as ChessPiece | undefined;

        if (clickedKing && onKingClick) {
          setIsKingSelected(true) // Disable clicks until reset
          console.log('King clicked, zooming exactly inside king');

          // Get king's world position
          const kingWorldPos = new THREE.Vector3();
          clickedKing.getWorldPosition(kingWorldPos);

          // Camera animation parameters
          const perspCamera = camera as PerspectiveCamera;
          // Store original camera state OUTSIDE animation so resetCamera always works
          const originalFov = perspCamera.fov;
          const originalPos = camera.position.clone();
          const originalLookAt = controlsRef.current ? controlsRef.current.target.clone() : kingWorldPos.clone();

          // Position the camera a bit in front of the king
          const offset = new THREE.Vector3(0, 2, 6); // Offset for close-up
          const targetPos = kingWorldPos.clone().add(offset);
          const targetLookAt = kingWorldPos.clone();
          const targetFov = 15; // Dramatic zoom
          const duration = 1000; // 1 second
          const startTime = Date.now();

          // Create a reset camera function to restore the original FOV and position
          // This function always uses the originalPos, originalFov, originalLookAt
          const resetCamera = () => {
            const resetStartTime = Date.now();
            const resetDuration = 1000;
            const startPos = camera.position.clone();
            const startFov = perspCamera.fov;
            const startLookAt = controlsRef.current ? controlsRef.current.target.clone() : kingWorldPos.clone();
            const resetAnimation = () => {
              const t = Math.min((Date.now() - resetStartTime) / resetDuration, 1);
              const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
              camera.position.lerpVectors(startPos, originalPos, easeT);
              perspCamera.fov = startFov + (originalFov - startFov) * easeT;
              perspCamera.updateProjectionMatrix();
              const lookAt = startLookAt.clone().lerp(originalLookAt, easeT);
              camera.lookAt(lookAt);
              if (controlsRef.current) controlsRef.current.target.copy(lookAt);
              if (t < 1) {
                requestAnimationFrame(resetAnimation);
              } else {
                setIsKingSelected(false) // Re-enable clicks
              }
            };
            resetAnimation();
          };

          // Animate camera to king
          const animateZoom = () => {
            const t = Math.min((Date.now() - startTime) / duration, 1);
            const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            camera.position.lerpVectors(originalPos, targetPos, easeT);
            perspCamera.fov = originalFov + (targetFov - originalFov) * easeT;
            perspCamera.updateProjectionMatrix();
            const lookAt = originalLookAt.clone().lerp(targetLookAt, easeT);
            camera.lookAt(lookAt);
            if (controlsRef.current) controlsRef.current.target.copy(lookAt);
            if (t < 1) {
              requestAnimationFrame(animateZoom);
            } else {
              // Animation completed, show the introduction
              onKingClick(resetCamera);
            }
          };

          // Start the animation
          animateZoom();
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleMouseClick);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleMouseClick);
    };
  }, [mouse, isLoaded, camera, raycaster, isKingSelected, onKingClick]);

  // Handle hover animations using raycaster
  useFrame(() => {
    // Stop hover effects when a king is selected and zoomed in
    if (!isLoaded || !chessboardRef.current || isKingSelected) {
      return
    }
    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Find intersections with chess pieces
    const intersects = raycaster.intersectObjects(chessboardRef.current.children, true);
    
    // Find the first intersected king piece - ONLY kings that haven't been raised can hover
    const firstChessPiece = intersects
      .map(i => i.object)
      .find(obj => {
        const piece = obj as ChessPiece
        return piece.isChessPiece && piece.pieceType === 'king'
      }) as ChessPiece | undefined
    
    // If hovering over a new piece
    if (firstChessPiece && firstChessPiece !== hoveredPiece) {
      // Reset previous hovered piece
      if (hoveredPiece) {
        if (hoveredPiece.originalPosition) {
          hoveredPiece.position.copy(hoveredPiece.originalPosition);
        }
        if (hoveredPiece.material) {
          (hoveredPiece.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x000000);
        }
      }
      // Set new hovered piece
      setHoveredPiece(firstChessPiece);
      if (firstChessPiece.material) {
        (firstChessPiece.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x555555);
      }
    } 
    // If no longer hovering any piece
    else if (!firstChessPiece && hoveredPiece) {
      // Reset the piece when mouse leaves
      if (hoveredPiece.originalPosition) {
        hoveredPiece.position.copy(hoveredPiece.originalPosition);
      }
      if (hoveredPiece.material) {
        (hoveredPiece.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x000000);
      }
      setHoveredPiece(null);
    }
    
    // Animate only currently hovered pieces that aren't permanently raised
    if (hoveredPiece && hoveredPiece.originalPosition) {
      // Make the piece float up by a very small amount from its original position
      hoveredPiece.position.y = hoveredPiece.originalPosition.y + 0.03 + Math.sin(Date.now() * 0.005) * 0.02;
    }
  });


  
  useEffect(() => {
    // Load the full chessboard with pieces
    const loader = new GLTFLoader()
  // We'll skip loading kings separately and instead identify them
  // in the main model by looking at names and geometry

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
          
          // Identify chess pieces by their position (pieces are above the board)
          if (node.position.y > 0) {
            const chessPiece = node as ChessPiece;
            chessPiece.isChessPiece = true;
            // Store original position for hover animation
            chessPiece.originalPosition = node.position.clone();
            
            // For the sake of simplicity, let's just mark the center pieces in the 
            // back ranks as kings, or use the node's name if it contains 'king'
            const nodeName = (node.name || '').toLowerCase();
            const parentName = (node.parent?.name || '').toLowerCase();
            
            // Try to identify kings - this depends on the model structure and positioning
            // Let's pick center pieces on both sides of the board
            const isKingByPosition = (
              // Must be on the center files (d or e)
              Math.abs(node.position.x) < 5 &&
              // Must be on the back rank (black or white)
              (Math.abs(node.position.z) > 30) &&
              // Must be taller than a pawn
              node.position.y > 0.5
            );
            
            if (nodeName.includes('king') || parentName.includes('king') || isKingByPosition) {
              chessPiece.pieceType = 'king';
              console.log('King piece identified:', node.name, 
                         'Position:', node.position.x.toFixed(2), 
                         node.position.y.toFixed(2), 
                         node.position.z.toFixed(2));
            }
          }
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

      {/* Orbit controls: all mouse movement disabled */}
      <OrbitControls
        ref={controlsRef}
        enableDamping={false}
        enableRotate={false}
        enableZoom={false}
        enablePan={false}
        mouseButtons={{ LEFT: 0, MIDDLE: 0, RIGHT: 0 }}
      />
      {/* Introduction is now rendered in App.tsx */}
    </>
  )
}

export default ChessScene