import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// External libraries (assuming they are loaded via <script> tags in index.html
// or imported/bundled correctly in your environment)
// NOTE: In a real React app, you'd typically install these via npm, but for
// a 1:1 conversion of the vanilla script structure, we assume globals or 
// direct imports based on the original code's module structure.
// Specifically: window.poseDetection and window.tf must be available.

// The original CSS is embedded directly for a single, runnable component file.
const style = `
  html, body { height: 100%; margin: 0; background: #0b0f14; color: #e8eef7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  #ar-tryon-app { position: fixed; inset: 0; overflow: hidden; }
  #ar-tryon-app video { 
    position: absolute; 
    left: 0; 
    top: 0; 
    width: 100%; 
    height: 100%; 
    object-fit: cover; 
    transform: scaleX(-1); 
    z-index: 0; 
    background: #000; 
  }
  #ar-tryon-app canvas { 
    position: absolute; 
    left: 0; 
    top: 0; 
    width: 100%; 
    height: 100%; 
    z-index: 1; 
  }
  .overlay-canvas { 
    position: absolute; 
    left: 0; 
    top: 0; 
    width: 100%; 
    height: 100%; 
    z-index: 2; 
    pointer-events: none;
  }
  .label-text { 
    position: absolute; 
    left: 12px; 
    top: 10px; 
    z-index: 3; 
    font: 14px/1.2 system-ui; 
    opacity: 0.9; 
    background: rgba(0,0,0,0.5);
    padding: 6px 10px;
    border-radius: 6px;
  }
  .panel { 
    position: absolute; 
    right: 12px; 
    top: 10px; 
    z-index: 3; 
    font: 13px/1.2 system-ui; 
    color: #e8eef7; 
    background: rgba(16,19,23,0.85); 
    backdrop-filter: blur(10px);
    border: 1px solid #2a3340; 
    border-radius: 8px; 
    padding: 12px; 
    width: 280px; 
    pointer-events: auto; /* Re-enable pointer events for the panel */
  }
  .panel h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 600;
    color: #9ecbff;
  }
  .row { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    margin: 8px 0; 
  }
  .row label { 
    width: 95px; 
    opacity: .85; 
    font-size: 12px;
  }
  .row input[type=range] { 
    flex: 1; 
    height: 4px;
    appearance: none;
    background: #1a2332;
    border-radius: 2px;
    outline: none;
  }
  .row input[type=range]::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    background: #9ecbff;
    border-radius: 50%;
    cursor: pointer;
  }
  .row input[type=number] { 
    width: 65px; 
    background: #0f1722; 
    color: #e8eef7; 
    border: 1px solid #314156; 
    border-radius: 6px; 
    padding: 4px 6px; 
    font-size: 12px;
  }
  .row input[type=checkbox] {
    width: 16px;
    height: 16px;
  }
  .status {
    position: absolute;
    bottom: 12px;
    left: 12px;
    z-index: 3;
    background: rgba(0,0,0,0.6);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
  }
  .status.good { color: #4ade80; }
  .status.warning { color: #facc15; }
  .status.error { color: #f87171; }
  
  .advanced {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #2a3340;
  }
  .toggle-advanced {
    background: none;
    border: 1px solid #314156;
    color: #9ecbff;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    margin-bottom: 8px;
    pointer-events: auto;
  }
  .toggle-advanced:hover {
    background: rgba(158, 203, 255, 0.1);
  }
  .advanced-controls {
    display: none;
  }
  .advanced-controls.show {
    display: block;
  }
`;

// --- Configuration Constants ---
const TRACKING_CONFIG = {
  minConfidence: 0.4,
  shoulderConfidenceThreshold: 0.5,
  hipConfidenceThreshold: 0.3,
  scaleSmoothing: 0.4,
  rotationSmoothing: 0.3,
  positionSmoothing: 0.5,
  torsoRatio: 2.2,
  depthEstimationFactor: 2.5,
  neckOffset: 0.15,
  MIN_POSE_SCORE: 0.25,
};

// --- Initial State for UI Controls ---
const INITIAL_CONTROLS = {
  poseModel: 'lightning',
  scaleMul: 1.15,
  offX: 0,
  offY: 0.05,
  rotZ: 0,
  smoothing: 0.65,
  depthOffset: 0.1,
  uniform: true,
  showSkeleton: true,
  controlsEnabled: false,
  advancedVisible: false,
};

// --- Utility Functions ---

// Convert image coordinates to 3D world coordinates
const imgToWorld = (x, y, depth, videoRef, camera) => {
  if (!videoRef.current || !camera) return new THREE.Vector3();

  const w = videoRef.current.videoWidth;
  const h = videoRef.current.videoHeight;

  // Normalize to NDC
  const ndcX = (x / w) * 2 - 1;
  const ndcY = -((y / h) * 2 - 1);

  // Create ray from camera
  const vec = new THREE.Vector3(ndcX, ndcY, 0.5);
  vec.unproject(camera);

  const ray = vec.sub(camera.position).normalize();
  const distance = (depth - camera.position.z) / ray.z;

  return camera.position.clone().add(ray.multiplyScalar(distance));
};

// Estimate depth based on shoulder width
const estimateDepth = (shoulderWidthPx, videoWidth, depthOffset) => {
  const normalizedWidth = shoulderWidthPx / videoWidth;
  const avgShoulderWidth = 0.15; // Average normalized shoulder width at optimal distance
  const depthScale = avgShoulderWidth / normalizedWidth;
  return depthScale * TRACKING_CONFIG.depthEstimationFactor + depthOffset;
};


// --- The React Component ---

const ARTryOnViewer = () => {
  // --- Refs for DOM Elements and Three.js Objects ---
  const appRef = useRef(null);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const modelRef = useRef(null); // The Three.js Group for the loaded T-shirt model
  
  const detectorRef = useRef(null);
  const lastValidPoseRef = useRef(null); // State for pose smoothing

  // --- React State for UI Controls and Status ---
  const [controls, setControls] = useState(INITIAL_CONTROLS);
  const [status, setStatus] = useState({ message: 'Initializing...', type: 'warning' });
  const [labelText, setLabelText] = useState('Initializing AR...');

  // Helper to update a single control value
  const handleControlChange = (e) => {
    const { id, value, type, checked } = e.target;
    setControls(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) : value),
    }));
  };
  
  // Update status display
  const updateStatus = useCallback((message, type = 'good') => {
    setStatus({ message, type });
  }, []);

  // --- Initializers ($`useEffect`$ hooks) ---

  // 1. Setup Three.js Scene and Renderer
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    if (appRef.current) {
        // Find and remove any previous canvas elements
        const oldCanvas = appRef.current.querySelector('canvas:not(#overlay)');
        if (oldCanvas) appRef.current.removeChild(oldCanvas);
        appRef.current.appendChild(renderer.domElement);
    }
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    camera.position.set(0, 0.15, 2.2);
    cameraRef.current = camera;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(0.5, 1.0, 0.5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    scene.add(new THREE.DirectionalLight(0x8090ff, 0.3).position.set(-0.5, 0.5, 0.5));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.2).position.set(0, 0.5, -1));

    // OrbitControls
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.05;
    orbitControls.target.set(0, 0, 0);
    orbitControls.enabled = false;
    controlsRef.current = orbitControls;

    // Handle resize
    const onResize = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        if (videoRef.current && overlayRef.current) {
            const rect = videoRef.current.getBoundingClientRect();
            overlayRef.current.width = rect.width;
            overlayRef.current.height = rect.height;
        }
    };
    window.addEventListener('resize', onResize);
    onResize();

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      orbitControls.dispose();
    };
  }, []); // Run only once on mount

  // 2. Load GLTF Model (T-shirt)
  const loadModel = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    // Cleanup previous model
    if (modelRef.current) {
        scene.remove(modelRef.current);
        modelRef.current = null;
    }

    setLabelText('Loading 3D model...');
    updateStatus('Loading 3D model...', 'warning');

    const loader = new GLTFLoader();
    
    loader.load(
      '/tshirt.glb',
      (gltf) => {
        const model = gltf.scene;

        const overrideMaterial = new THREE.MeshStandardMaterial({
          color: 0xff0000,
          roughness: 0.8,
          metalness: 0.1,
          side: THREE.DoubleSide,
          flatShading: false,
        });

        model.traverse((node) => {
          if (node.isMesh) {
            node.material = overrideMaterial;
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        // Initial rotation/flip
        model.rotation.y = -Math.PI;
        model.rotation.x = Math.PI;

        // Center the model geometry
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const modelGroup = new THREE.Group();
        modelGroup.add(model);
        scene.add(modelGroup);
        modelRef.current = modelGroup;
        
        setLabelText('AR T-shirt Try-On Active');
        updateStatus('Ready for tracking', 'good');
      },
      (xhr) => {
        const pct = ((xhr.loaded / (xhr.total || 1)) * 100).toFixed(0);
        setLabelText(`Loading model: ${pct}%`);
      },
      (err) => {
        setLabelText('Model loading failed');
        updateStatus('Failed to load 3D model', 'error');
        console.error(err);
      }
    );
  }, [updateStatus]);
  
  useEffect(() => {
      loadModel();
  }, [loadModel]);

  // 3. Initialize Webcam
  useEffect(() => {
    const initWebcam = async () => {
      if (!videoRef.current) return;
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });
        videoRef.current.srcObject = stream;
        await new Promise(r => {
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            r();
          };
        });
        updateStatus('Webcam ready', 'good');
      } catch (err) {
        updateStatus('Webcam access denied', 'error');
        console.error('Webcam error:', err);
      }
    };
    initWebcam();
  }, [updateStatus]);
  
  // 4. Initialize Pose Detector (Triggered by control change)
  useEffect(() => {
    const initPoseDetector = async () => {
      // Access global library loaded via <script> tags (or configured bundler)
      const poseDetection = window.poseDetection; 
      
      if (!poseDetection) {
        updateStatus('TensorFlow/PoseNet library not found.', 'error');
        return;
      }
      
      if (detectorRef.current) {
        try { await detectorRef.current.dispose(); } catch(e) {}
      }

      if (controls.poseModel === 'off') {
        detectorRef.current = null;
        updateStatus('Tracking disabled', 'warning');
        return;
      }

      updateStatus('Initializing pose detector...', 'warning');

      const model = poseDetection.SupportedModels.MoveNet;
      const type = controls.poseModel === 'thunder'
        ? poseDetection.movenet.modelType.SINGLEPOSE_THUNDER
        : poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING;

      detectorRef.current = await poseDetection.createDetector(model, {
        modelType: type,
        enableSmoothing: true,
        minPoseScore: TRACKING_CONFIG.MIN_POSE_SCORE,
        multiPoseMaxDimension: 256,
      });

      updateStatus('Pose detector ready', 'good');
    };
    
    initPoseDetector();
    
    return () => {
        if (detectorRef.current) {
            detectorRef.current.dispose();
            detectorRef.current = null;
        }
    };
  }, [controls.poseModel, updateStatus]);


  // --- Pose Tracking and Animation Loop ---
  useEffect(() => {
    let animationFrameId;
    let poseFrameId;
    
    const video = videoRef.current;
    const modelGroup = modelRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const controlsRefCurrent = controlsRef.current;

    // Logic to calculate smoothed pose metrics
    const smoothPoseMetrics = (newMetrics) => {
      let lastValidPose = lastValidPoseRef.current;
      if (!lastValidPose) {
        lastValidPoseRef.current = newMetrics;
        return newMetrics;
      }

      const smoothingFactor = controls.smoothing;
      const smoothed = {};

      for (const key in newMetrics) {
        if (key === 'confidence') {
          smoothed[key] = newMetrics[key];
        } else if (key === 'shoulderAngle') {
          let diff = newMetrics[key] - lastValidPose[key];
          if (diff > Math.PI) diff -= 2 * Math.PI;
          if (diff < -Math.PI) diff += 2 * Math.PI;
          smoothed[key] = lastValidPose[key] + diff * (1 - smoothingFactor * TRACKING_CONFIG.rotationSmoothing);
        } else if (key === 'shoulderWidth' || key === 'torsoHeight') {
          smoothed[key] = lastValidPose[key] * smoothingFactor * TRACKING_CONFIG.scaleSmoothing + 
                          newMetrics[key] * (1 - smoothingFactor * TRACKING_CONFIG.scaleSmoothing);
        } else {
          smoothed[key] = lastValidPose[key] * smoothingFactor * TRACKING_CONFIG.positionSmoothing + 
                          newMetrics[key] * (1 - smoothingFactor * TRACKING_CONFIG.positionSmoothing);
        }
      }

      lastValidPoseRef.current = smoothed;
      return smoothed;
    };
    
    // Logic to calculate initial pose metrics
    const calculatePoseMetrics = (keypoints) => {
      const metrics = {
        shoulderWidth: 0, torsoHeight: 0, shoulderAngle: 0,
        centerX: 0, centerY: 0, confidence: 0, depth: 0,
      };

      const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
      const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
      const leftHip = keypoints.find(kp => kp.name === 'left_hip');
      const rightHip = keypoints.find(kp => kp.name === 'right_hip');
      const nose = keypoints.find(kp => kp.name === 'nose');

      if (!leftShoulder || !rightShoulder) return null;

      if (leftShoulder.score < TRACKING_CONFIG.shoulderConfidenceThreshold ||
          rightShoulder.score < TRACKING_CONFIG.shoulderConfidenceThreshold) {
        return null;
      }

      const dx = rightShoulder.x - leftShoulder.x;
      const dy = rightShoulder.y - leftShoulder.y;
      metrics.shoulderWidth = Math.sqrt(dx * dx + dy * dy);
      metrics.shoulderAngle = Math.atan2(dy, dx);

      metrics.centerX = (leftShoulder.x + rightShoulder.x) / 2;
      metrics.centerY = (leftShoulder.y + rightShoulder.y) / 2;

      if (nose && nose.score > 0.3) {
        const neckY = metrics.centerY + (nose.y - metrics.centerY) * 0.3;
        metrics.centerY = neckY + metrics.shoulderWidth * TRACKING_CONFIG.neckOffset;
      } else {
        metrics.centerY += metrics.shoulderWidth * TRACKING_CONFIG.neckOffset;
      }

      if (leftHip && rightHip && leftHip.score > TRACKING_CONFIG.hipConfidenceThreshold && rightHip.score > TRACKING_CONFIG.hipConfidenceThreshold) {
        const hipCenterY = (leftHip.y + rightHip.y) / 2;
        metrics.torsoHeight = Math.abs(hipCenterY - metrics.centerY);
      } else {
        metrics.torsoHeight = metrics.shoulderWidth * TRACKING_CONFIG.torsoRatio;
      }

      const scores = [leftShoulder.score, rightShoulder.score];
      if (leftHip) scores.push(leftHip.score);
      if (rightHip) scores.push(rightHip.score);
      metrics.confidence = scores.reduce((a, b) => a + b, 0) / scores.length;

      metrics.depth = estimateDepth(metrics.shoulderWidth, video.videoWidth, controls.depthOffset);

      return metrics;
    };
    
    // Logic to draw skeleton on overlay canvas
    const drawPose = (keypoints) => {
      const overlay = overlayRef.current;
      if (!overlay || !controls.showSkeleton) {
        overlay.getContext('2d').clearRect(0, 0, overlay.width, overlay.height);
        return;
      }
      
      const octx = overlay.getContext('2d');
      octx.clearRect(0, 0, overlay.width, overlay.height);
      octx.save();
      octx.translate(overlay.width, 0);
      octx.scale(-1, 1);
      
      const scaleX = overlay.width / video.videoWidth;
      const scaleY = overlay.height / video.videoHeight;
      
      const connections = [
        ['left_shoulder','right_shoulder'], ['left_shoulder','left_elbow'], 
        ['left_elbow','left_wrist'], ['right_shoulder','right_elbow'], 
        ['right_elbow','right_wrist'], ['left_shoulder','left_hip'],
        ['right_shoulder','right_hip'], ['left_hip','right_hip'], 
        ['left_hip','left_knee'], ['left_knee','left_ankle'],
        ['right_hip','right_knee'], ['right_knee','right_ankle'],
        ['left_ear','left_shoulder'], ['right_ear','right_shoulder'],
        ['nose','left_eye'], ['nose','right_eye']
      ];
      
      const kpMap = {};
      for (const kp of keypoints) { if (kp.score && kp.score > 0.2) kpMap[kp.name] = kp; }
      
      octx.strokeStyle = 'rgba(0,255,180,0.4)';
      octx.lineWidth = 2;
      for (const [a, b] of connections) {
        const p = kpMap[a], q = kpMap[b];
        if (!p || !q) continue;
        octx.beginPath();
        octx.moveTo(p.x * scaleX, p.y * scaleY);
        octx.lineTo(q.x * scaleX, q.y * scaleY);
        octx.stroke();
      }
      
      for (const kp of keypoints) {
        if (kp.score && kp.score > 0.2) {
          const confidence = kp.score;
          const hue = confidence * 120;
          octx.fillStyle = `hsla(${hue}, 100%, 50%, 0.9)`;
          octx.beginPath();
          octx.arc(kp.x * scaleX, kp.y * scaleY, 4 + confidence * 4, 0, Math.PI * 2);
          octx.fill();
        }
      }
      octx.restore();
    };
    
    // Logic to apply pose data to the model
    const updateModelTransform = (metrics) => {
      if (!modelGroup || !camera) return;

      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      
      const offsetX = controls.offX * videoW;
      const offsetY = controls.offY * 1.3 * videoH; // Adjusted multiplier from original JS

      const targetX = videoW - metrics.centerX - offsetX;
      const targetY = metrics.centerY + offsetY;
      const worldPos = imgToWorld(targetX, targetY, -metrics.depth, videoRef, camera);

      // Position
      modelGroup.position.lerp(worldPos, 0.3);

      // Scaling
      const box = new THREE.Box3().setFromObject(modelGroup);
      const modelSize = box.getSize(new THREE.Vector3());

      const worldShoulderWidth = Math.abs(imgToWorld(0, 0, -metrics.depth, videoRef, camera).x - imgToWorld(metrics.shoulderWidth, 0, -metrics.depth, videoRef, camera).x);
      const worldTorsoHeight = Math.abs(imgToWorld(0, 0, -metrics.depth, videoRef, camera).y - imgToWorld(0, metrics.torsoHeight, -metrics.depth, videoRef, camera).y);

      const manualScale = controls.scaleMul;
      const baseScaleX = (worldShoulderWidth / modelSize.x) * 1.6; 
      const baseScaleY = (worldTorsoHeight / modelSize.y) * 1.3; 

      const targetScaleX = baseScaleX * manualScale;
      const targetScaleY = controls.uniform ? targetScaleX : baseScaleY * manualScale;
      const targetScaleZ = (targetScaleX + targetScaleY) / 2 * manualScale * 0.5;

      modelGroup.scale.x = THREE.MathUtils.lerp(modelGroup.scale.x, targetScaleX, 0.2);
      modelGroup.scale.y = THREE.MathUtils.lerp(modelGroup.scale.y, targetScaleY, 0.2);
      modelGroup.scale.z = THREE.MathUtils.lerp(modelGroup.scale.z, targetScaleZ, 0.2);

      // Rotation
      const manualRotation = controls.rotZ;
      const targetRotation = metrics.shoulderAngle + manualRotation;
      modelGroup.rotation.z = THREE.MathUtils.lerp(modelGroup.rotation.z, targetRotation, 0.25);
      
      // Breathing animation
      const time = Date.now() * 0.001;
      modelGroup.position.y += Math.sin(time * 2) * 0.005;
    };


    // Pose Detection Loop
    const poseLoop = async () => {
      const detector = detectorRef.current;
      
      if (!detector || !modelGroup || video.readyState < 2) {
        poseFrameId = requestAnimationFrame(poseLoop);
        return;
      }
      
      try {
        const poses = await detector.estimatePoses(video, { 
          flipHorizontal: false,
          maxPoses: 1,
          scoreThreshold: TRACKING_CONFIG.minConfidence
        });

        if (poses && poses.length > 0 && poses[0].keypoints) {
          const keypoints = poses[0].keypoints;
          
          const metrics = calculatePoseMetrics(keypoints);
          
          if (metrics && metrics.confidence > TRACKING_CONFIG.minConfidence) {
            const smoothedMetrics = smoothPoseMetrics(metrics);
            updateModelTransform(smoothedMetrics);
            drawPose(keypoints);
            
            const confidencePercent = Math.round(smoothedMetrics.confidence * 100);
            updateStatus(`Tracking (${confidencePercent}% confidence)`, 
                        smoothedMetrics.confidence > 0.6 ? 'good' : 'warning');
          } else {
            updateStatus('Poor tracking - adjust position', 'warning');
            if (lastValidPoseRef.current) {
              lastValidPoseRef.current.confidence *= 0.95;
              if (lastValidPoseRef.current.confidence > 0.3) {
                updateModelTransform(lastValidPoseRef.current);
              }
            }
            drawPose([]);
          }
        } else {
          drawPose([]);
          updateStatus('No pose detected - step into view', 'error');
          if (modelGroup && modelGroup.scale.x > 0.1) {
            modelGroup.scale.multiplyScalar(0.9);
          }
        }
      } catch (err) {
        console.error('Pose detection error:', err);
        updateStatus('Tracking error', 'error');
      }
      
      poseFrameId = requestAnimationFrame(poseLoop);
    };

    // Main Animation Loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      if (controlsRefCurrent && controlsRefCurrent.enabled) {
        controlsRefCurrent.update();
      }
      
      if (renderer && sceneRef.current && camera) {
        renderer.render(sceneRef.current, camera);
      }
    };
    
    // Start loops only when required elements are ready
    if (video && modelGroup && renderer && camera) {
      animate();
      poseLoop();
      updateStatus('System ready - position yourself in view', 'good');
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      cancelAnimationFrame(poseFrameId);
    };
  }, [controls.scaleMul, controls.offX, controls.offY, controls.rotZ, controls.uniform, controls.smoothing, controls.depthOffset, controls.showSkeleton, updateStatus]);

  // 5. Handle OrbitControls Enable/Disable
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = controls.controlsEnabled;
    }
  }, [controls.controlsEnabled]);
  
  // 6. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.key) {
        case ' ':
          setControls(prev => ({ ...prev, showSkeleton: !prev.showSkeleton }));
          break;
        case 'c':
          setControls(prev => ({ ...prev, controlsEnabled: !prev.controlsEnabled }));
          break;
        case 'r':
          // Reset controls to initial values
          setControls(prev => ({
            ...prev,
            scaleMul: 1.15, offX: 0, offY: 0.05, rotZ: 0, smoothing: 0.65, depthOffset: 0.1
          }));
          break;
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Rendered JSX ---
  return (
    <>
      {/* Inject the styles into the head for a perfect match of the original layout */}
      <style>{style}</style> 
      <div id="ar-tryon-app" ref={appRef}>
        <video id="webcam" ref={videoRef} autoPlay playsInline muted></video>
        {/* The canvas for Three.js rendering will be appended to appRef */}
        <canvas id="overlay" className="overlay-canvas" ref={overlayRef}></canvas>
      </div>
      
      <div id="label" className="label-text">{labelText}</div>
      
      <div className="panel">
        <h3>AR T-shirt Controls</h3>
        <div className="row">
          <label htmlFor="poseModel">Model Quality</label>
          <select id="poseModel" value={controls.poseModel} onChange={handleControlChange}>
            <option value="lightning">Fast (Lightning)</option>
            <option value="thunder">Accurate (Thunder)</option>
            <option value="off">Tracking Off</option>
          </select>
        </div>
        <div className="row">
          <label htmlFor="scaleMul">Size</label>
          <input id="scaleMul" type="range" min="0.7" max="3.5" step="0.01" value={controls.scaleMul} onChange={handleControlChange} />
          <input id="scaleMulNum" type="number" min="0.7" max="3.5" step="0.01" value={controls.scaleMul} onChange={(e) => handleControlChange({...e, id: 'scaleMul'})} />
        </div>
        <div className="row">
          <label htmlFor="offX">Position X</label>
          <input id="offX" type="range" min="-0.15" max="0.5" step="0.001" value={controls.offX} onChange={handleControlChange} />
          <input id="offXNum" type="number" min="-0.15" max="0.5" step="0.001" value={controls.offX} onChange={(e) => handleControlChange({...e, id: 'offX'})} />
        </div>
        <div className="row">
          <label htmlFor="offY">Position Y</label>
          <input id="offY" type="range" min="-0.2" max="1.5" step="0.001" value={controls.offY} onChange={handleControlChange} />
          <input id="offYNum" type="number" min="-0.2" max="1.5" step="0.001" value={controls.offY} onChange={(e) => handleControlChange({...e, id: 'offY'})} />
        </div>
        
        <div className="advanced">
          <button className="toggle-advanced" onClick={() => setControls(prev => ({...prev, advancedVisible: !prev.advancedVisible}))}>
            Advanced Settings {controls.advancedVisible ? '▲' : '▼'}
          </button>
          <div className={`advanced-controls ${controls.advancedVisible ? 'show' : ''}`}>
            <div className="row">
              <label htmlFor="rotZ">Rotation</label>
              <input id="rotZ" type="range" min="-0.3" max="0.3" step="0.005" value={controls.rotZ} onChange={handleControlChange} />
              <input id="rotZNum" type="number" min="-0.3" max="0.3" step="0.005" value={controls.rotZ} onChange={(e) => handleControlChange({...e, id: 'rotZ'})} />
            </div>
            <div className="row">
              <label htmlFor="smoothing">Smoothing</label>
              <input id="smoothing" type="range" min="0.1" max="0.9" step="0.05" value={controls.smoothing} onChange={handleControlChange} />
              <input id="smoothingNum" type="number" min="0.1" max="0.9" step="0.05" value={controls.smoothing} onChange={(e) => handleControlChange({...e, id: 'smoothing'})} />
            </div>
            <div className="row">
              <label htmlFor="depthOffset">Depth Offset</label>
              <input id="depthOffset" type="range" min="-0.5" max="0.5" step="0.01" value={controls.depthOffset} onChange={handleControlChange} />
              <input id="depthOffsetNum" type="number" min="-0.5" max="0.5" step="0.01" value={controls.depthOffset} onChange={(e) => handleControlChange({...e, id: 'depthOffset'})} />
            </div>
            <div className="row">
              <label htmlFor="uniform">Uniform Scale</label>
              <input id="uniform" type="checkbox" checked={controls.uniform} onChange={handleControlChange} />
              <span style={{opacity:.7, fontSize: '11px'}}>Keep proportions</span>
            </div>
            <div className="row">
              <label htmlFor="showSkeleton">Show Skeleton</label>
              <input id="showSkeleton" type="checkbox" checked={controls.showSkeleton} onChange={handleControlChange} />
              <span style={{opacity:.7, fontSize: '11px'}}>Debug overlay</span>
            </div>
            <div className="row">
              <label htmlFor="controlsEnabled">Camera Controls (c)</label>
              <input id="controlsEnabled" type="checkbox" checked={controls.controlsEnabled} onChange={handleControlChange} />
              <span style={{opacity:.7, fontSize: '11px'}}>Enable OrbitControls</span>
            </div>
          </div>
        </div>
      </div>
      
      <div id="status" className={`status ${status.type}`}>{status.message}</div>
    </>
  );
};

export default ARTryOnViewer;