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

async function openScene(url, fileName, fileSize, initialView, skybox = null, temporaryUrl = false) {
  if (!url || loading) return;
  loading = true;
  status.textContent = `Loading ${fileName}…`;
  try {
    loadScene ??= import('./viewer.js')
      .then((module) => module.createViewer(host))
      .catch((error) => { loadScene = undefined; throw error; });
    const viewer = await loadScene;
    void viewer.setSkybox(skybox);
    try {
      await viewer.open(url, fileName, initialView);
    } catch (error) {
      if (temporaryUrl) URL.revokeObjectURL(url);
      throw error;
    }
    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = temporaryUrl ? url : undefined;
    emptyState.hidden = true;
    status.textContent = fileSize
      ? `${fileName} · ${(fileSize / 1_000_000).toFixed(1)} MB`
      : `${fileName} · ready`;
  } catch (error) {
    status.textContent = `Could not load scene: ${errorMessage(error)}`;
  } finally {
    loading = false;
  }
}

function openFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  void openScene(url, file.name, file.size, undefined, null, true);
}

picker.addEventListener('change', () => openFile(picker.files?.[0]));

async function loadGarden() {
  try {
    const [metadataResponse, skyboxMetadataResponse] = await Promise.all([
      fetch('./assets/garden-from-wall.json'),
      fetch('./assets/garden-from-wall-skybox.json'),
    ]);
    if (!metadataResponse.ok) throw new Error(`Garden metadata request failed (${metadataResponse.status}).`);
    if (!skyboxMetadataResponse.ok) throw new Error('Garden sky metadata request failed (' + skyboxMetadataResponse.status + ').');
    const [metadata, skyboxMetadata] = await Promise.all([
      metadataResponse.json(),
      skyboxMetadataResponse.json(),
    ]);
    const skybox = {
      url: './assets/garden-from-wall-skybox.jpg',
      faceOrder: skyboxMetadata.cubemap.order,
    };
    await openScene(
      './assets/garden-from-wall.spz',
      'garden-from-wall.spz',
      undefined,
      initialViewFromMetadata(metadata),
      skybox,
    );
  } catch (error) {
    status.textContent = `Could not load the garden: ${errorMessage(error)}`;
  }
}

void loadGarden();
