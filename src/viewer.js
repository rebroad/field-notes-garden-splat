import * as THREE from 'three';
import { SparkRenderer, SplatFileType, SplatMesh } from '@sparkjsdev/spark';

export function createViewer(host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#101410');
  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
  camera.up.set(0, -1, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);

  let activeSplat;
  let center = new THREE.Vector3();
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let yaw = 0;
  let pitch = 0;
  let distance = 3;
  let frameRequested = false;

  function render() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(() => {
      frameRequested = false;
      renderer.render(scene, camera);
    });
  }
  scene.add(new SparkRenderer({ renderer, onDirty: render }));

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  function updateCamera() {
    pitch = Math.max(-1.35, Math.min(1.35, pitch));
    camera.position.set(
      center.x + distance * Math.sin(yaw) * Math.cos(pitch),
      center.y + distance * Math.sin(pitch),
      center.z + distance * Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(center);
    render();
  }

  async function openCandidate(candidate, fileName, initialView) {
    scene.add(candidate);
    try {
      await candidate.initialized;
    } catch (error) {
      scene.remove(candidate);
      candidate.dispose();
      throw error;
    }
    if (activeSplat) {
      scene.remove(activeSplat);
      activeSplat.dispose();
    }
    activeSplat = candidate;
    if (initialView) {
      center.fromArray(initialView.center);
      camera.position.fromArray(initialView.position);
      const offset = camera.position.clone().sub(center);
      distance = Math.max(offset.length(), 0.2);
      yaw = Math.atan2(offset.x, offset.z);
      pitch = Math.asin(THREE.MathUtils.clamp(offset.y / distance, -1, 1));
    } else {
      const bounds = candidate.getBoundingBox();
      center = bounds.getCenter(new THREE.Vector3());
      const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.01);
      distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.15;
      yaw = 0;
      pitch = 0.12;
    }
    updateCamera();
  }

  renderer.domElement.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.setPointerCapture(event.pointerId);
  });
  renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
  renderer.domElement.addEventListener('pointercancel', () => { dragging = false; });
  renderer.domElement.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    yaw -= (event.clientX - lastX) * 0.005;
    pitch -= (event.clientY - lastY) * 0.005;
    lastX = event.clientX;
    lastY = event.clientY;
    updateCamera();
  });
  renderer.domElement.addEventListener('wheel', (event) => {
    distance = Math.max(0.2, Math.min(100, distance * Math.exp(event.deltaY * 0.001)));
    updateCamera();
  }, { passive: true });

  return {
    async open(url, fileName, initialView) {
      const fileType = fileName.toLowerCase().endsWith('.splat') ? SplatFileType.SPLAT : undefined;
      const candidate = new SplatMesh({ url, fileName, fileType });
      await openCandidate(candidate, fileName, initialView);
    },
    async openBuffer(buffer, fileName, initialView) {
      const fileType = fileName.toLowerCase().endsWith('.splat') ? SplatFileType.SPLAT : undefined;
      const candidate = new SplatMesh({ fileBytes: buffer, fileName, fileType });
      await openCandidate(candidate, fileName, initialView);
    },
  };
}
