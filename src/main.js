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

async function openFile(file, initialView) {
  if (!file || loading) return;
  loading = true;
  status.textContent = `Loading ${file.name}…`;
  try {
    loadScene ??= import('./viewer.js')
      .then((module) => module.createViewer(host))
      .catch((error) => { loadScene = undefined; throw error; });
    const viewer = await loadScene;
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
    const [sceneResponse, metadataResponse] = await Promise.all([
      fetch('./assets/garden-from-wall.splat'),
      fetch('./assets/garden-from-wall.json'),
    ]);
    if (!sceneResponse.ok) throw new Error(`Garden scene request failed (${sceneResponse.status}).`);
    if (!metadataResponse.ok) throw new Error(`Garden metadata request failed (${metadataResponse.status}).`);
    const [scene, metadata] = await Promise.all([
      sceneResponse.blob(),
      metadataResponse.json(),
    ]);
    await openFile(new File([scene], 'garden-from-wall.splat'), initialViewFromMetadata(metadata));
  } catch (error) {
    status.textContent = `Could not load the garden: ${errorMessage(error)}`;
  }
}

void loadGarden();
