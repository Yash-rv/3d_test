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
    
    // Create the camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(50, 50, 50); // Position the camera at an angle
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
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Load the chessboard
    loadChessboard();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function loadChessboard() {
    // Show loading progress
    const updateProgress = (xhr) => {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100;
            console.log('Loading: ' + percentComplete.toFixed(2) + '%');
            
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
            console.log('Chessboard loaded successfully');
            chessboard = gltf.scene;
            
            // Enhance materials
            chessboard.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            // Scale the chessboard
            chessboard.scale.set(10, 10, 10); // Large scale
            
            // Add to scene
            scene.add(chessboard);
            
            // Hide loading screen
            const loadingElement = document.getElementById('loading');
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Move camera to better position
            camera.position.set(50, 40, 50);
            controls.update();
        },
        updateProgress,
        function(error) {
            console.error('Error loading chessboard:', error);
            alert('Failed to load the chessboard model. Please check the console for details.');
        }
    );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}