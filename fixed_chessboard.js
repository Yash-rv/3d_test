// Import the required libraries
import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';
import { GLTFLoader } from './libs/GLTFLoader.js';

// Global variables
let scene, camera, renderer, controls;
let chessboard;

// Initialize the scene
init();

// Animation loop
animate();

function init() {
    // Create the scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Create the camera with extremely far clip plane for ULTRA BLUDINGTON-sized board
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 50000);
    camera.position.set(0, 200, 200); // Position the camera MUCH closer to see the massive board
    camera.lookAt(0, 0, 0);
    
    // Create the renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add spotlights from multiple angles to make sure it's well lit
    const spotLight1 = new THREE.SpotLight(0xffffff, 2);
    spotLight1.position.set(100, 200, 100);
    spotLight1.angle = Math.PI / 3;
    spotLight1.penumbra = 0.1;
    spotLight1.decay = 0;
    spotLight1.distance = 0;
    spotLight1.castShadow = true;
    scene.add(spotLight1);
    
    const spotLight2 = new THREE.SpotLight(0xffffff, 2);
    spotLight2.position.set(-100, 200, -100);
    spotLight2.angle = Math.PI / 3;
    spotLight2.penumbra = 0.1;
    spotLight2.decay = 0;
    spotLight2.distance = 0;
    spotLight2.castShadow = true;
    scene.add(spotLight2);
    scene.add(directionalLight);
    
    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enabled = false; // Initially disabled
    
    // Load the chessboard
    loadChessboard();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Show the intro text
    setTimeout(() => {
        const introText = document.getElementById('intro-text');
        if (introText) {
            introText.style.opacity = '1';
            
            // Hide the text after 2 seconds and start camera movement
            setTimeout(() => {
                introText.style.opacity = '0';
                introText.style.display = 'none';
                startCameraMovement();
            }, 2000);
        }
    }, 1000);
}

function loadChessboard() {
    // Show loading progress
    const updateProgress = (xhr) => {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100;
            
            const progressBar = document.querySelector('#loading .progress-bar');
            if (progressBar) {
                progressBar.style.width = percentComplete.toFixed(2) + '%';
            }
        }
    };

    // Load chessboard model
    const loader = new GLTFLoader();
    loader.load(
        './3D Models/Chess Pawns/cHESS_bOARD.glb', // Path to your model
        function(gltf) {
            chessboard = gltf.scene;
            
            // Enhance materials
            chessboard.traverse((node) => {
                if (node.isMesh) {
                    // Create high-quality materials
                    if (node.material) {
                        // Determine if white or black square
                        const color = node.material.color ? node.material.color.getHex() : 0;
                        const isWhite = (color > 0x888888);
                        
                        node.material = new THREE.MeshPhysicalMaterial({
                            color: isWhite ? 0xf0f0f5 : 0x101018,
                            metalness: isWhite ? 0.2 : 0.7,
                            roughness: isWhite ? 0.05 : 0.1,
                            clearcoat: 1.0,
                            clearcoatRoughness: 0.1
                        });
                    }
                    
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            // Scale the chessboard (1000 times bigger as requested - ULTRA BLUDINGTON SIZE!!!)
            chessboard.scale.set(1000, 1000, 1000); // ULTRA MEGA BLUDINGTON SCALE!
            
            // Ensure it's positioned correctly at the origin
            chessboard.position.set(0, 0, 0);
            
            // Add to scene
            scene.add(chessboard);
            
            // Add a reflective floor (ENORMOUS for the BLUDINGTON-sized board)
            const floorGeometry = new THREE.CircleGeometry(3200, 128);
            const floorMaterial = new THREE.MeshStandardMaterial({
                color: 0x000000,
                metalness: 0.9,
                roughness: 0.2
            });
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -20; // Much lower position for the BLUDINGTON-sized board
            floor.receiveShadow = true;
            scene.add(floor);
            
            // Hide loading screen
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
        },
        updateProgress,
        function(error) {
            console.error('Error loading chessboard:', error);
        }
    );
}

function startCameraMovement() {
    // Animate camera to slanted position
    let startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    let endPos = { x: 100, y: 100, z: 100 }; // ULTRA CLOSE to the 1000x scale board
    
    // Duration in milliseconds
    const duration = 2000;
    const startTime = Date.now();
    
    function updateCamera() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-in-out function
        const easeProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        camera.position.x = startPos.x + (endPos.x - startPos.x) * easeProgress;
        camera.position.y = startPos.y + (endPos.y - startPos.y) * easeProgress;
        camera.position.z = startPos.z + (endPos.z - startPos.z) * easeProgress;
        
        camera.lookAt(0, 0, 0);
        
        if (progress < 1) {
            requestAnimationFrame(updateCamera);
        } else {
            // Enable controls when animation is complete
            controls.enabled = true;
        }
    }
    
    updateCamera();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Rotate the chessboard slowly
    if (chessboard) {
        chessboard.rotation.y += 0.002; // Slow rotation to show it off
    }
    
    if (controls.enabled) {
        controls.update();
    }
    
    renderer.render(scene, camera);
}