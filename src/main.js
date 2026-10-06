import './style.css';
import { initialViewFromMetadata } from './capture-view.js';

const host = document.querySelector('#scene');
const picker = document.querySelector('#scene-file');
const emptyState = document.querySelector('#empty-state');
const status = document.querySelector('#status');

let activeUrl;
let loadScene;
let loading = false;

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? 'Unknown error');
}

async function openFile(file, initialView, skybox = null) {
  if (!file || loading) return;
  loading = true;
  status.textContent = `Loading ${file.name}…`;
  try {
    loadScene ??= import('./viewer.js')
      .then((module) => module.createViewer(host))
      .catch((error) => { loadScene = undefined; throw error; });
    const viewer = await loadScene;
    await viewer.setSkybox(skybox);
    const nextUrl = URL.createObjectURL(file);
    try {
      await viewer.open(nextUrl, file.name, initialView);
    } catch (error) {
      URL.revokeObjectURL(nextUrl);
      throw error;
    }
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = nextUrl;
    emptyState.hidden = true;
    status.textContent = `${file.name} · ${(file.size / 1_000_000).toFixed(1)} MB`;
  } catch (error) {
    status.textContent = `Could not load scene: ${errorMessage(error)}`;
  } finally {
    loading = false;
  }
}

picker.addEventListener('change', () => openFile(picker.files?.[0]));

async function loadGarden() {
  try {
    const [sceneResponse, metadataResponse, skyboxMetadataResponse] = await Promise.all([
      fetch('./assets/garden-from-wall.splat'),
      fetch('./assets/garden-from-wall.json'),
      fetch('./assets/garden-from-wall-skybox.json'),
    ]);
    if (!sceneResponse.ok) throw new Error(`Garden scene request failed (${sceneResponse.status}).`);
    if (!metadataResponse.ok) throw new Error(`Garden metadata request failed (${metadataResponse.status}).`);
    if (!skyboxMetadataResponse.ok) throw new Error('Garden sky metadata request failed (' + skyboxMetadataResponse.status + ').');
    const [scene, metadata, skyboxMetadata] = await Promise.all([
      sceneResponse.blob(),
      metadataResponse.json(),
      skyboxMetadataResponse.json(),
    ]);
    const skybox = {
      url: './assets/garden-from-wall-skybox.jpg',
      faceOrder: skyboxMetadata.cubemap.order,
    };
    await openFile(new File([scene], 'garden-from-wall.splat'), initialViewFromMetadata(metadata), skybox);
  } catch (error) {
    status.textContent = `Could not load the garden: ${errorMessage(error)}`;
  }
}

void loadGarden();
