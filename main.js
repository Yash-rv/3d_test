// Import the required libraries
import * as THREE from './libs/three.module.js';
import { OrbitControls } from './libs/OrbitControls.js';
import { GLTFLoader } from './libs/GLTFLoader.js';
import anime from './libs/anime.es.js';

let scene, camera, renderer, controls;
let model, mixer;
let clock = new THREE.Clock();
let isInsideModel = false;
let originalCameraPosition;
let textPanel, backButton;
let lightHelpers = [];
let crystalFragments = [];
let isShatteringInProgress = false;

// Initialize the scene
init();

// Setup animation loop
animate();

function init() {
    // Create scene with a dark starry background
    scene = new THREE.Scene();
    
    // Create a starry background
    const stars = new THREE.BufferGeometry();
    const starsCount = 2000;
    const positions = [];
    const starColors = [];
    
    for (let i = 0; i < starsCount; i++) {
        // Create a sphere of stars
        const r = 50; // Radius of star sphere
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        
        positions.push(x, y, z);
        
        // Add slight color variation to stars
        const intensity = 0.5 + Math.random() * 0.5;
        starColors.push(intensity, intensity, intensity + Math.random() * 0.2);
    }
    
    stars.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    stars.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        size: 0.1,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const starField = new THREE.Points(stars, starMaterial);
    scene.add(starField);
    
    // Add fog for depth
    scene.fog = new THREE.FogExp2(0x000011, 0.00125);

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

    // Add enhanced lighting for crystal - increased brightness and more lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Main directional light - brighter
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5);
    directionalLight.position.set(1, 2, 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.bias = -0.001;
    scene.add(directionalLight);
    
    // Create a circle of lights around the crystal
    const colors = [
        0x8844ff, 0x4488ff, 0xff88aa, 0xaaffee, 
        0xffaa44, 0x44ffaa, 0xaa44ff, 0xffffff
    ];
    
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        const pointLight = new THREE.PointLight(colors[i], 3, 10);
        pointLight.position.set(x, 0.5, z);
        scene.add(pointLight);
        
        // Create a small sphere to show the light position
        const sphereGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: colors[i] });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.copy(pointLight.position);
        scene.add(sphere);
        lightHelpers.push(sphere);
    }
    
    // Add a spotlight from above
    const spotLight = new THREE.SpotLight(0xffffff, 5, 20, Math.PI / 6, 0.5, 2);
    spotLight.position.set(0, 5, 0);
    spotLight.target.position.set(0, 0, 0);
    scene.add(spotLight);
    scene.add(spotLight.target);

    // Add orbit controls for interaction
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // Set initial target to the origin
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.75;
    controls.enablePan = false; // Disable panning to prevent disorientation

    // Load the King Crystal model
    loadModel();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Add animation for lights
    animateLights();
    
    // Add click event listener for model interaction
    document.addEventListener('click', onModelClick);
    
    // Create text panel for inside view (initially hidden)
    createTextPanel();
}

// Create a simple procedural environment map for the crystal
function createEnvMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Create a radial gradient for a simple HDR-like environment
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    // Add color stops to create a star-field like environment
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, '#4488ff');
    gradient.addColorStop(0.5, '#111133');
    gradient.addColorStop(1, '#000011');
    
    // Fill with gradient
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some random "stars"
    context.fillStyle = 'white';
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2;
        context.fillRect(x, y, size, size);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    return texture;
}

function loadModel() {
    // Create and set the environment map
    const envMap = createEnvMap();
    scene.environment = envMap;
    
    const loader = new GLTFLoader();
    loader.load(
        './3D Models/Chess Pawns/King_Crystal.glb', 
        function(gltf) {
            model = gltf.scene;
            
            // Set model properties for transparent crystal material
            model.traverse((node) => {
                if (node.isMesh) {
                    // Apply enhanced crystal material
                    node.material = new THREE.MeshPhysicalMaterial({
                        color: 0xffffff,
                        metalness: 0.0,
                        roughness: 0.0,
                        transmission: 0.98,  // Even higher transparency
                        transparent: true,   // Enable transparency
                        opacity: 0.5,        // More transparent
                        thickness: 0.1,      // Even thinner for more light pass-through
                        clearcoat: 1.0,      // Add clearcoat
                        clearcoatRoughness: 0.0,
                        envMapIntensity: 4.0, // More environment reflections
                        reflectivity: 1.0,   // Maximum reflectivity
                        ior: 2.4,            // Higher index of refraction
                        specularIntensity: 1.0,
                        specularColor: 0xffffff
                    });
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            // Position and scale the model
            model.position.set(0, 0, 0);
            model.scale.set(1.2, 1.2, 1.2); // Slightly bigger for better visibility
            
            // Apply a slight rotation to catch the light better initially
            model.rotation.y = Math.PI / 6;
            
            // Add the model to the scene
            scene.add(model);
            
            // Set the orbit controls target to the origin (0,0,0) since that's where the model's center is now
            controls.target.set(0, 0, 0);
            
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

// Initialize inner content interaction
function initInnerContent() {
    // Set up the back button event listener for the inner content page
    document.getElementById('back-button').addEventListener('click', function() {
        const innerContent = document.getElementById('inner-content');
        
        // Fade out and hide the inner content
        innerContent.style.opacity = '0';
        
        setTimeout(() => {
            innerContent.style.display = 'none';
            
            // Remove all crystal fragments
            crystalFragments.forEach(fragment => {
                scene.remove(fragment);
            });
            crystalFragments = [];
            
            // Make the original model visible again
            model.visible = true;
            
            // Reset model position and rotation
            model.position.set(0, 0, 0);
            model.rotation.y = Math.PI / 6; // Reset to initial rotation
            
            // Return camera to original position
            anime({
                targets: camera.position,
                x: originalCameraPosition.x,
                y: originalCameraPosition.y,
                z: originalCameraPosition.z,
                duration: 800,
                easing: 'easeInOutQuad',
                complete: function() {
                    // Re-enable controls and reset flags
                    controls.enabled = true;
                    isInsideModel = false;
                    isShatteringInProgress = false;
                    
                    // Show click hint again
                    document.getElementById('click-hint').style.display = 'block';
                    
                    // Fade in light helpers
                    lightHelpers.forEach(helper => {
                        anime({
                            targets: helper.material,
                            opacity: 1,
                            duration: 800,
                            easing: 'easeInQuad'
                        });
                        helper.material.transparent = true;
                    });
                    
                    // Resume model animation
                    animateModel();
                }
            });
        }, 500);
    });
}

// No longer needed, but keeping function names to avoid errors
function createTextPanel() {
    // This function is now just initializing the inner content
    initInnerContent();
}

// No longer needed as we're using HTML button
function createBackButton() {
    // Empty function to maintain compatibility
}

// Handle click events for model interaction
function onModelClick(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    
    // Hide click hint when clicking anywhere
    const clickHint = document.getElementById('click-hint');
    if (clickHint) {
        clickHint.style.display = 'none';
    }
    
    // Raycasting to detect object clicks
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    
    // Don't process clicks if already shattering
    if (!isInsideModel && !isShatteringInProgress) {
        // Check if we clicked on the model
        const intersects = raycaster.intersectObject(model, true);
        
        if (intersects.length > 0) {
            // Store original camera position for returning later
            originalCameraPosition = camera.position.clone();
            
            // Disable orbit controls temporarily
            controls.enabled = false;
            
            // Set flags
            isInsideModel = true;
            isShatteringInProgress = true;
            
            // Hide the click hint
            document.getElementById('click-hint').style.display = 'none';
            
            // Create crystal fragments for the shattering effect
            createCrystalFragments();
            
            // First, create a shaking effect to indicate that the crystal is about to break
            const originalPosition = new THREE.Vector3().copy(model.position);
            const originalRotation = new THREE.Euler().copy(model.rotation);
            
            // Flash the lights dramatically
            const lights = scene.children.filter(child => child instanceof THREE.PointLight);
            lights.forEach(light => {
                anime({
                    targets: light,
                    intensity: [light.intensity, light.intensity * 2, light.intensity],
                    duration: 800,
                    easing: 'easeInOutQuad'
                });
            });
            
            // Shake the model - series of quick, small, random movements
            anime({
                targets: {},
                duration: 800,
                easing: 'easeInQuad',
                update: function(anim) {
                    if (model) {
                        // Shake more intensely as the animation progresses
                        const intensity = anim.progress / 100 * 0.06;
                        
                        // Apply random offsets to position
                        model.position.x = originalPosition.x + (Math.random() * 2 - 1) * intensity;
                        model.position.y = originalPosition.y + (Math.random() * 2 - 1) * intensity;
                        model.position.z = originalPosition.z + (Math.random() * 2 - 1) * intensity;
                        
                        // Apply random offsets to rotation
                        model.rotation.x = originalRotation.x + (Math.random() * 2 - 1) * intensity * 0.3;
                        model.rotation.y = originalRotation.y + (Math.random() * 2 - 1) * intensity * 0.3;
                        model.rotation.z = originalRotation.z + (Math.random() * 2 - 1) * intensity * 0.3;
                    }
                },
                complete: function() {
                    // After shaking, shatter the crystal
                    shatterCrystal();
                    
                    // Fade out light helpers while inside
                    lightHelpers.forEach(helper => {
                        anime({
                            targets: helper.material,
                            opacity: 0,
                            duration: 1000,
                            easing: 'easeOutQuad'
                        });
                        helper.material.transparent = true;
                    });
                }
            });
        }
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
        
        // Add a subtle floating animation
        anime({
            targets: model.position,
            y: [0, 0.1, 0],
            duration: 2000,
            easing: 'easeInOutQuad',
            loop: true
        });
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

// Function to create crystal fragments for shattering effect
function createCrystalFragments() {
    // Remove any existing fragments
    crystalFragments.forEach(fragment => {
        scene.remove(fragment);
    });
    crystalFragments = [];
    
    // Get the model's bounding box to determine size
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Create between 20-30 crystal fragments
    const fragmentCount = 25;
    
    // Create a crystalline material similar to the main model
    const fragmentMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0.1,
        roughness: 0.2,
        transmission: 0.95,
        transparent: true,
        opacity: 0.7,
        thickness: 0.5,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1,
        envMapIntensity: 3.0,
        side: THREE.DoubleSide
    });
    
    // Create fragments based on various basic geometries to simulate broken crystal
    for (let i = 0; i < fragmentCount; i++) {
        let geometry;
        
        // Create different types of crystal shards
        const geomType = Math.floor(Math.random() * 5);
        
        switch (geomType) {
            case 0: // Tetrahedron
                geometry = new THREE.TetrahedronGeometry(0.2 + Math.random() * 0.3);
                break;
            case 1: // Diamond-like shape (octahedron)
                geometry = new THREE.OctahedronGeometry(0.2 + Math.random() * 0.2);
                break;
            case 2: // Elongated shard (custom geometry)
                geometry = new THREE.ConeGeometry(0.1, 0.4 + Math.random() * 0.3, 4);
                break;
            case 3: // Flat shard
                geometry = new THREE.BoxGeometry(
                    0.05 + Math.random() * 0.1,
                    0.2 + Math.random() * 0.3,
                    0.2 + Math.random() * 0.3
                );
                break;
            case 4: // Small crystal chunk
                geometry = new THREE.IcosahedronGeometry(0.1 + Math.random() * 0.15);
                break;
        }
        
        // Create the fragment mesh
        const fragment = new THREE.Mesh(geometry, fragmentMaterial);
        
        // Start each fragment at the model's position
        // with a slight offset to create a more natural break
        fragment.position.set(
            model.position.x + (Math.random() * 0.2 - 0.1) * size.x,
            model.position.y + (Math.random() * 0.2 - 0.1) * size.y,
            model.position.z + (Math.random() * 0.2 - 0.1) * size.z
        );
        
        // Give each fragment a random rotation
        fragment.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        // Store target position for animation (where the fragment will fly to)
        fragment.userData.targetPosition = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        
        // Store target rotation for animation
        fragment.userData.targetRotation = new THREE.Vector3(
            Math.random() * Math.PI * 4,
            Math.random() * Math.PI * 4,
            Math.random() * Math.PI * 4
        );
        
        // Store a random speed factor for each fragment
        fragment.userData.speedFactor = 0.5 + Math.random() * 1.5;
        
        // Set fragment to initially be invisible
        fragment.visible = false;
        
        // Add to scene and store in array
        scene.add(fragment);
        crystalFragments.push(fragment);
    }
}

// Function to animate the crystal shattering effect
function shatterCrystal() {
    // Hide the original model
    model.visible = false;
    
    // Make all fragments visible
    crystalFragments.forEach(fragment => {
        fragment.visible = true;
    });
    
    // Animate each fragment flying outward
    crystalFragments.forEach((fragment, index) => {
        anime({
            targets: fragment.position,
            x: fragment.userData.targetPosition.x,
            y: fragment.userData.targetPosition.y,
            z: fragment.userData.targetPosition.z,
            duration: 1500,
            delay: Math.random() * 200,
            easing: 'easeOutExpo',
        });
        
        anime({
            targets: fragment.rotation,
            x: fragment.userData.targetRotation.x,
            y: fragment.userData.targetRotation.y,
            z: fragment.userData.targetRotation.z,
            duration: 1500,
            delay: Math.random() * 200,
            easing: 'easeOutQuad',
        });
        
        // Fade out the fragments
        anime({
            targets: fragment.material,
            opacity: 0,
            duration: 1000,
            delay: 500 + Math.random() * 500,
            easing: 'easeOutQuad',
            update: function() {
                // Make sure transparency is enabled
                fragment.material.transparent = true;
                fragment.material.needsUpdate = true;
            }
        });
    });
    
    // Show inner content after a short delay
    setTimeout(() => {
        const innerContent = document.getElementById('inner-content');
        innerContent.style.display = 'flex';
        innerContent.style.opacity = '0';
        
        // Fade in the content
        setTimeout(() => {
            innerContent.style.opacity = '1';
            innerContent.classList.add('fade-in');
            
            // Reset the shattering flag after content is shown
            setTimeout(() => {
                isShatteringInProgress = false;
            }, 500);
        }, 10);
    }, 1000);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update orbit controls
    controls.update();
    
    // Render the scene
    renderer.render(scene, camera);
}