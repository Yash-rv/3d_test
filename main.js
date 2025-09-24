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

// Create a text panel to display when inside the crystal
function createTextPanel() {
    // Create a plane for the text panel
    const panelGeometry = new THREE.PlaneGeometry(3, 2);
    
    // Create canvas for the text
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const context = canvas.getContext('2d');
    
    // Clear canvas completely
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fill with solid blue background
    context.fillStyle = 'rgba(0, 20, 80, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add clean border
    context.strokeStyle = '#4488ff';
    context.lineWidth = 10;
    context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
    
    // Add heading - well spaced
    context.fillStyle = '#ffffff';
    context.font = 'bold 60px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('Crystal King', canvas.width / 2, 100);
    
    // Add text with ample spacing
    context.font = '36px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Carefully position each line with plenty of space
    context.fillText('This magnificent crystal chess piece represents power and clarity.', canvas.width / 2, 250);
    context.fillText('Crafted with precision, it symbolizes strategic thinking and foresight.', canvas.width / 2, 350);
    context.fillText('The transparency of the crystal reflects the clarity of mind needed in chess.', canvas.width / 2, 450);
    context.fillText('As light passes through it, wisdom and enlightenment are revealed.', canvas.width / 2, 550);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 0.95
    });
    
    // Create mesh and add to scene (initially hidden)
    textPanel = new THREE.Mesh(panelGeometry, material);
    textPanel.position.set(0, 0.5, -1); // Position it closer for better visibility
    textPanel.visible = false;
    scene.add(textPanel);
    
    // Create back button
    createBackButton();
}

// Create a back button to return from inside view
function createBackButton() {
    const buttonGeometry = new THREE.PlaneGeometry(0.8, 0.4);
    
    // Create canvas for the button
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 200;
    const context = canvas.getContext('2d');
    
    // Clear canvas completely
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create solid background
    context.fillStyle = 'rgba(50, 50, 180, 0.95)';
    
    // Draw rounded rectangle
    const radius = 30;
    context.beginPath();
    context.moveTo(radius, 0);
    context.lineTo(canvas.width - radius, 0);
    context.arcTo(canvas.width, 0, canvas.width, radius, radius);
    context.lineTo(canvas.width, canvas.height - radius);
    context.arcTo(canvas.width, canvas.height, canvas.width - radius, canvas.height, radius);
    context.lineTo(radius, canvas.height);
    context.arcTo(0, canvas.height, 0, canvas.height - radius, radius);
    context.lineTo(0, radius);
    context.arcTo(0, 0, radius, 0, radius);
    context.closePath();
    context.fill();
    
    // Add solid border
    context.strokeStyle = '#ffffff';
    context.lineWidth = 8;
    context.stroke();
    
    // Add text - large and clear
    context.fillStyle = '#ffffff';
    context.font = 'bold 60px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('BACK', canvas.width / 2, canvas.height / 2);
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        opacity: 1.0
    });
    
    // Create mesh and add to scene (initially hidden)
    backButton = new THREE.Mesh(buttonGeometry, material);
    backButton.position.set(0, -1.2, -1); // Position below text panel and at the same distance
    backButton.visible = false;
    scene.add(backButton);
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
    
    if (!isInsideModel) {
        // Check if we clicked on the model
        const intersects = raycaster.intersectObject(model, true);
        
        if (intersects.length > 0) {
            // Get the model's bounding box
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            
            // Store original camera position for returning later
            originalCameraPosition = camera.position.clone();
            
            // Disable orbit controls temporarily
            controls.enabled = false;
            
            // Animate going inside the model
            isInsideModel = true;
            
            // Hide the click hint
            document.getElementById('click-hint').style.display = 'none';
            
            // Animate camera to the center of the model
            anime({
                targets: camera.position,
                x: center.x,
                y: center.y,
                z: center.z + 2, // Position in front of model
                duration: 1200,
                easing: 'easeInOutQuad',
                update: () => camera.lookAt(center),
                complete: function() {
                    // Expand the model
                    anime({
                        targets: model.scale,
                        x: 25,
                        y: 25,
                        z: 25,
                        duration: 1800,
                        easing: 'easeOutExpo',
                        complete: function() {
                            // Set final camera position inside the model
                            camera.position.set(center.x, center.y, center.z);
                            camera.lookAt(center.x, center.y, center.z - 5);
                            
                            // Show text panel and back button
                            textPanel.position.set(center.x, center.y, center.z - 1.5);
                            backButton.position.set(center.x, center.y - 1.2, center.z - 1.5);
                            textPanel.visible = true;
                            backButton.visible = true;
                        }
                    });
                }
            });
            
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
    } else {
        // Check if we clicked the back button
        const intersects = raycaster.intersectObject(backButton);
        
        if (intersects.length > 0) {
            // Immediately hide text panel and back button
            textPanel.visible = false;
            backButton.visible = false;

            // Get the model's center
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            
            // Move camera to a position where we can see the shrinking model
            anime({
                targets: camera.position,
                x: center.x,
                y: center.y,
                z: center.z + 2,
                duration: 800,
                easing: 'easeInOutQuad',
                update: () => camera.lookAt(center),
                complete: function() {
                    // Shrink the model back to original size
                    anime({
                        targets: model.scale,
                        x: 1.2,
                        y: 1.2,
                        z: 1.2,
                        duration: 1200,
                        easing: 'easeInExpo',
                        complete: function() {
                            // Return camera to original position
                            anime({
                                targets: camera.position,
                                x: originalCameraPosition.x,
                                y: originalCameraPosition.y,
                                z: originalCameraPosition.z,
                                duration: 1000,
                                easing: 'easeInOutQuad',
                                complete: function() {
                                    // Re-enable controls and reset flags
                                    controls.enabled = true;
                                    isInsideModel = false;
                                    
                                    // Show click hint again
                                    document.getElementById('click-hint').style.display = 'block';
                                }
                            });
                        }
                    });
                }
            });
            
            // Fade in light helpers
            lightHelpers.forEach(helper => {
                anime({
                    targets: helper.material,
                    opacity: 1,
                    duration: 1000,
                    easing: 'easeInQuad'
                });
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

function animate() {
    requestAnimationFrame(animate);
    
    // Update orbit controls
    controls.update();
    
    // If we're inside the model, make the panels face the camera
    if (isInsideModel && textPanel.visible) {
        // Only update the orientation, not the position
        // Use a fixed position in front of the camera for stability
        textPanel.lookAt(camera.position);
        backButton.lookAt(camera.position);
        
        // Keep text panel and button at a consistent distance
        textPanel.position.set(0, 0.5, camera.position.z - 1);
        backButton.position.set(0, -1.2, camera.position.z - 1);
    }
    
    // Render the scene
    renderer.render(scene, camera);
}