// Import the required libraries
import * as THREE from '../js/lib/three.module.js';
import { GLTFLoader } from '../js/lib/GLTFLoader.js';
import { OrbitControls } from '../js/lib/OrbitControls.js';
import anime from '../js/lib/anime.es.js';

let scene, camera, renderer, controls;
let model, mixer, particles;
let clock = new THREE.Clock();

// Initialize the scene
init();

// Setup animation loop
animate();

function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    
    // Add fog for depth
    scene.fog = new THREE.FogExp2(0x111111, 0.05);

    // Create camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 3);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 3);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Add a soft point light to enhance crystal effect
    const pointLight1 = new THREE.PointLight(0x8844ff, 1, 10);
    pointLight1.position.set(1, 1, 1);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x4488ff, 1, 10);
    pointLight2.position.set(-1, 1, -1);
    scene.add(pointLight2);

    // Add orbit controls for interaction
    controls = new OrbitControls(camera, renderer.domElement);
    controls.minDistance = 1.5;
    controls.maxDistance = 10;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Load the King Crystal model
    loadModel();
    
    // Create dust particles
    createParticles();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Add animation for lights
    animateLights();
}

function loadModel() {
    const loader = new GLTFLoader();
    loader.load(
        './3D Models/Chess Pawns/King_Crystal.glb', 
        function(gltf) {
            model = gltf.scene;
            
            // Set model properties for transparent crystal material
            model.traverse((node) => {
                if (node.isMesh) {
                    // Apply crystal material
                    node.material = new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        metalness: 0.1,
                        roughness: 0.1,
                        transmission: 0.9,  // Make it transparent
                        thickness: 0.5,     // Refraction thickness
                        clearcoat: 1.0,     // Add clearcoat
                        clearcoatRoughness: 0.1,
                        envMapIntensity: 1.5
                    });
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            // Position and scale the model
            model.position.set(0, 0, 0);
            model.scale.set(1, 1, 1); // Adjust scale if needed
            
            // Add the model to the scene
            scene.add(model);
            
            // Hide loading screen
            document.getElementById('loading').style.display = 'none';
            
            // Add initial animation
            animateModel();
        },
        // Progress callback
        function(xhr) {
            const loadingPercentage = Math.floor((xhr.loaded / xhr.total) * 100);
            document.getElementById('loading').innerHTML = `Loading: ${loadingPercentage}%`;
        },
        // Error callback
        function(error) {
            console.error('Error loading model:', error);
            document.getElementById('loading').innerHTML = 'Error loading model';
        }
    );
}

function createParticles() {
    const particleCount = 500;
    const particles_geo = new THREE.BufferGeometry();
    const particles_material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const particlesPositions = [];
    
    for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 5;
        const y = Math.random() * 3;
        const z = (Math.random() - 0.5) * 5;
        
        particlesPositions.push(x, y, z);
    }
    
    particles_geo.setAttribute('position', new THREE.Float32BufferAttribute(particlesPositions, 3));
    particles = new THREE.Points(particles_geo, particles_material);
    scene.add(particles);
}

function animateParticles() {
    if (particles) {
        const positions = particles.geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Slowly move particles
            positions[i + 1] -= 0.002; // Move down
            
            // Reset particles that fall below a certain point
            if (positions[i + 1] < -1) {
                positions[i + 1] = 3;
            }
            
            // Add small random movement
            positions[i] += (Math.random() - 0.5) * 0.002;
            positions[i + 2] += (Math.random() - 0.5) * 0.002;
        }
        
        particles.geometry.attributes.position.needsUpdate = true;
    }
}

function animateModel() {
    if (model) {
        // Use anime.js to create an animation for the model
        anime({
            targets: model.rotation,
            y: [0, Math.PI * 2],
            duration: 10000,
            easing: 'linear',
            loop: true
        });
        
        /*
        // Add a subtle floating animation
        anime({
            targets: model.position,
            y: [0, 0.1, 0],
            duration: 2000,
            easing: 'easeInOutQuad',
            loop: true
        });
        */
    }
}

function animateLights() {
    const lights = scene.children.filter(child => child instanceof THREE.PointLight);
    
    lights.forEach((light, index) => {
        // Create randomized color animation for each light
        anime({
            targets: light,
            intensity: [0.5, 1.5],
            duration: 3000 + (index * 500),
            easing: 'easeInOutSine',
            direction: 'alternate',
            loop: true
        });
        
        // Animate light position in a small circular path
        const radius = 1;
        const startAngle = index * Math.PI;
        
        anime({
            targets: {},  // Dummy target
            duration: 10000 + (index * 2000),
            easing: 'linear',
            loop: true,
            update: function(anim) {
                const angle = startAngle + ((anim.progress / 100) * Math.PI * 2);
                light.position.x = Math.cos(angle) * radius;
                light.position.z = Math.sin(angle) * radius;
            }
        });
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update orbit controls
    controls.update();
    
    // Animate dust particles
    animateParticles();
    
    // Render the scene
    renderer.render(scene, camera);
}