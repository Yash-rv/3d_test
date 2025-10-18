// Import the required libraries
import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';
import { GLTFLoader } from './libs/GLTFLoader.js';
import anime from './libs/anime.es.js';

// Global variables
let scene, camera, renderer, controls;
let chessboard;
let clock = new THREE.Clock();
let isAnimating = false;

// Initialize the scene
init();

// Setup animation loop
animate();

function init() {
    // Create scene with a pure black background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // Create camera with wider FOV to capture more of the board
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Position camera closer to make board fill the screen
    camera.position.set(0, 100, 0); // Directly above but closer
    camera.lookAt(0, 0, 0);
    
    // Create renderer with high quality settings
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);
    
    // Set up orbit controls (disabled for now)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enabled = false;
    
    // Add subtle ambient light
    const ambientLight = new THREE.AmbientLight(0x050510, 0.2);
    scene.add(ambientLight);
    
    // Add key light for dramatic lighting - warm main light
    const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.2);
    keyLight.position.set(5, 15, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 4096; // Higher resolution shadows
    keyLight.shadow.mapSize.height = 4096;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.bias = -0.0001;
    
    // Adjust shadow camera dimensions for more precise shadows
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    
    scene.add(keyLight);
    
    // Add cool blue fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0x8090ff, 0.4);
    fillLight.position.set(-8, 12, -8);
    scene.add(fillLight);
    
    // Add subtle rim light for edge highlighting
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);
    
    // Add a very subtle red accent light
    const accentLight = new THREE.DirectionalLight(0xff3030, 0.1);
    accentLight.position.set(-10, 2, 3);
    scene.add(accentLight);
    
    // Load the chessboard model
    loadChessboard();
    
    // Setup window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Setup intro text display - reduced delay so board appears sooner
    setTimeout(showIntroText, 500);
}

// Function to load the chessboard model
function loadChessboard() {
    const loader = new GLTFLoader();
    
    // Update the loading progress bar
    const updateProgress = (xhr) => {
        if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            const progressBar = document.querySelector('#loading .progress-bar');
            if (progressBar) {
                progressBar.style.width = percentComplete + '%';
            }
        }
    };
    
    // Load chessboard
    loader.load(
        './3D Models/Chess Pawns/cHESS_bOARD.glb',
        function(gltf) {
            chessboard = gltf.scene;
            
            // Apply premium materials to the chessboard
            chessboard.traverse((node) => {
                if (node.isMesh) {
                    // Check if it's a white or black square based on material color
                    if (node.material) {
                        const isWhiteSquare = node.material.color && 
                                             (node.material.color.r > 0.5 || 
                                              node.material.color.g > 0.5 || 
                                              node.material.color.b > 0.5);
                        
                        if (isWhiteSquare) {
                            // Create a marble-like material for white squares
                            node.material = new THREE.MeshPhysicalMaterial({
                                color: new THREE.Color(0xf0f0f5),
                                metalness: 0.2,
                                roughness: 0.05,
                                clearcoat: 1.0,
                                clearcoatRoughness: 0.1,
                                reflectivity: 0.8,
                                envMapIntensity: 0.8
                            });
                        } else {
                            // Create a dark polished material for black squares
                            node.material = new THREE.MeshPhysicalMaterial({
                                color: new THREE.Color(0x101018),
                                metalness: 0.7,
                                roughness: 0.1,
                                clearcoat: 0.9,
                                clearcoatRoughness: 0.1,
                                reflectivity: 1.0,
                                envMapIntensity: 0.5
                            });
                        }
                    } else {
                        // Default material if no color information
                        node.material = new THREE.MeshPhysicalMaterial({
                            color: new THREE.Color(0x222222),
                            metalness: 0.7,
                            roughness: 0.2,
                            clearcoat: 0.8,
                            clearcoatRoughness: 0.2,
                            reflectivity: 1.0,
                        });
                    }
                    
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            // Scale and position the chessboard - DRAMATICALLY larger as requested
            chessboard.scale.set(20.0, 20.0, 20.0); // Increased by 20x as requested
            chessboard.position.set(0, 0, 0);
            
            // Add the chessboard to the scene
            scene.add(chessboard);
            
            // Create a reflective floor beneath the chessboard - much larger to match the 20x board
            const floorGeometry = new THREE.CircleGeometry(250, 64);
            const floorMaterial = new THREE.MeshStandardMaterial({
                color: 0x000000,
                metalness: 0.9,
                roughness: 0.2,
                envMapIntensity: 1.0,
            });
            
            const floor = new THREE.Mesh(floorGeometry, floorMaterial);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = -0.2;
            floor.receiveShadow = true;
            scene.add(floor);
            
            // Add subtle fog in the background
            scene.fog = new THREE.FogExp2(0x000000, 0.02);
            
            // Hide the loading screen
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
            }, 100);
        },
        updateProgress,
        function(error) {
            console.error('Error loading chessboard model:', error);
        }
    );
}

// Show the intro text
function showIntroText() {
    const introText = document.getElementById('intro-text');
    if (!introText) return; // Safety check
    
    // Fade in the text
    introText.style.opacity = '1';
    
    // Only start camera movement AFTER the board is loaded and visible
    if (chessboard) {
        // Short text display time to avoid blank screen
        setTimeout(() => {
            if (introText) {
                introText.style.opacity = '0';
                introText.style.display = 'none'; // Completely hide it
            }
            // Start camera animation right after text fades
            startCameraMovement();
        }, 1500);
    } else {
        // If board not loaded yet, wait a bit more
        setTimeout(showIntroText, 500);
    }
}

// Start the camera animation sequence
function startCameraMovement() {
    if (isAnimating) return;
    isAnimating = true;
    
    // Make sure chessboard is visible
    if (chessboard) {
        chessboard.visible = true;
    }
    
    // Add dramatic lighting during animation
    const spotLight = new THREE.SpotLight(0xffffff, 5.0, 500, Math.PI / 6, 0.5, 1);
    spotLight.position.set(0, 300, 0);
    spotLight.target = chessboard;
    spotLight.castShadow = true;
    scene.add(spotLight);
    
    // First animation - slant down to see board
    anime({
        targets: camera.position,
        x: 80,
        y: 120,
        z: 80,
        duration: 2000,
        easing: 'easeInOutQuad',
        update: function() {
            camera.lookAt(0, 0, 0);
        },
        complete: function() {
            // Enable orbit controls with restrictions
            controls.enabled = true;
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.enableZoom = true;
            controls.enablePan = false;
            
            // Limit the camera movement - keeping it closer to board
            controls.minDistance = 100; // Closer minimum distance
            controls.maxDistance = 300; // Limited maximum distance
            controls.minPolarAngle = Math.PI / 8; // Allows slightly lower viewing angle
            controls.maxPolarAngle = Math.PI / 2.5; // Limited how high camera can go
            
            // Set the target to the center of the chessboard
            controls.target.set(0, 0, 0);
            controls.update();
            
            isAnimating = false;
            
            // Fade out the spotlight gradually
            anime({
                targets: spotLight,
                intensity: 0,
                duration: 2000,
                easing: 'easeOutQuad',
                complete: function() {
                    scene.remove(spotLight);
                }
            });
        }
    });
}

// Handle window resizing
function onWindowResize() {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update orbit controls if enabled
    if (controls.enabled) {
        controls.update();
    }
    
    // Render the scene
    renderer.render(scene, camera);
}