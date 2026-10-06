import * as THREE from 'three';
import { SparkRenderer, SplatFileType, SplatMesh } from '@sparkjsdev/spark';
import { loadSkybox } from './skybox.js';

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
  let activeSkybox;
  let center = new THREE.Vector3();
  let yaw = 0;
  let pitch = 0;
  let distance = 3;
  let frameRequested = false;
  const pointers = new Map();
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let gesture;

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

  function panBy(dx, dy) {
    const height = renderer.domElement.clientHeight;
    if (!height) return;
    const unitsPerPixel = 2 * distance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / height;
    camera.updateMatrixWorld(true);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    center.addScaledVector(right, dx * unitsPerPixel);
    center.addScaledVector(up, dy * unitsPerPixel);
    updateCamera();
  }

  function centerAt(clientX, clientY) {
    if (!activeSplat) return false;
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    camera.updateMatrixWorld(true);
    activeSplat.updateWorldMatrix(true, false);
    raycaster.setFromCamera(pointerNdc, camera);
    const hit = raycaster.intersectObject(activeSplat, false)[0];
    if (!hit) return false;
    center.copy(hit.point);
    updateCamera();
    return true;
  }

  async function setSkybox(skybox) {
    activeSkybox?.dispose();
    activeSkybox = undefined;
    scene.background = new THREE.Color('#101410');
    if (!skybox) {
      render();
      return;
    }
    try {
      activeSkybox = await loadSkybox(skybox.url, skybox.faceOrder);
      scene.background = activeSkybox;
    } catch (error) {
      console.warn('Could not load garden skybox:', error);
    }
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
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, type: event.pointerType });
    renderer.domElement.setPointerCapture(event.pointerId);
    if (pointers.size === 1) {
      gesture = {
        mode: event.shiftKey ? 'pan' : 'orbit',
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        moved: false,
      };
      return;
    }
    const touches = [...pointers.entries()].filter(([, point]) => point.type === 'touch');
    if (touches.length === 2) {
      const [[id1, first], [id2, second]] = touches;
      gesture = {
        mode: 'touch-pan',
        pointerIds: [id1, id2],
        centerX: (first.x + second.x) / 2,
        centerY: (first.y + second.y) / 2,
        span: Math.hypot(first.x - second.x, first.y - second.y),
      };
    } else {
      gesture = undefined;
    }
  });
  renderer.domElement.addEventListener('pointermove', (event) => {
    const point = pointers.get(event.pointerId);
    if (!point) return;
    point.x = event.clientX;
    point.y = event.clientY;

    if (gesture?.mode === 'touch-pan') {
      const [first, second] = gesture.pointerIds.map((id) => pointers.get(id));
      if (!first || !second) return;
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const span = Math.hypot(first.x - second.x, first.y - second.y);
      panBy(centerX - gesture.centerX, centerY - gesture.centerY);
      if (span > 0 && gesture.span > 0) {
        distance = THREE.MathUtils.clamp(distance * gesture.span / span, 0.2, 100);
        updateCamera();
      }
      gesture.centerX = centerX;
      gesture.centerY = centerY;
      gesture.span = span;
      return;
    }

    if (!gesture || gesture.pointerId !== event.pointerId || pointers.size !== 1) return;
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 7) gesture.moved = true;
    if (event.shiftKey) gesture.mode = 'pan';
    if (gesture.mode === 'pan') {
      panBy(dx, dy);
    } else {
      yaw -= dx * 0.005;
      pitch -= dy * 0.005;
      updateCamera();
    }
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  });
  renderer.domElement.addEventListener('pointerup', (event) => {
    const canCenter = pointers.size === 1
      && gesture?.mode === 'orbit'
      && gesture.pointerId === event.pointerId
      && !gesture.moved
      && !event.shiftKey;
    if (canCenter) centerAt(event.clientX, event.clientY);
    pointers.delete(event.pointerId);
    if (pointers.size === 1) {
      const [pointerId, point] = pointers.entries().next().value;
      gesture = {
        mode: 'orbit',
        pointerId,
        startX: point.x,
        startY: point.y,
        lastX: point.x,
        lastY: point.y,
        moved: true,
      };
    } else {
      gesture = undefined;
    }
  });
  renderer.domElement.addEventListener('pointercancel', (event) => {
    pointers.delete(event.pointerId);
    gesture = undefined;
  });
  renderer.domElement.addEventListener('wheel', (event) => {
    distance = Math.max(0.2, Math.min(100, distance * Math.exp(event.deltaY * 0.001)));
    updateCamera();
  }, { passive: true });

  return {
    setSkybox,
    async open(url, fileName, initialView) {
      const extension = fileName.toLowerCase().split('.').at(-1);
      const fileType = extension === 'splat' ? SplatFileType.SPLAT
        : extension === 'spz' ? SplatFileType.SPZ : undefined;
      const candidate = new SplatMesh({ url, fileName, fileType });
      await openCandidate(candidate, fileName, initialView);
    },
    async openBuffer(buffer, fileName, initialView) {
      const extension = fileName.toLowerCase().split('.').at(-1);
      const fileType = extension === 'splat' ? SplatFileType.SPLAT
        : extension === 'spz' ? SplatFileType.SPZ : undefined;
      const candidate = new SplatMesh({ fileBytes: buffer, fileName, fileType });
      await openCandidate(candidate, fileName, initialView);
    },
  };
}
