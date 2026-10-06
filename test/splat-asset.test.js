import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import { initialViewFromMetadata } from '../src/capture-view.js';
import { cubeFaceIndices } from '../src/skybox.js';

const scenePath = new URL('../public/assets/garden-from-wall.splat', import.meta.url);
const metadataPath = new URL('../public/assets/garden-from-wall.json', import.meta.url);

test('garden asset is a complete standard 32-byte-record splat file', async () => {
  const scene = await fs.readFile(scenePath);
  assert.equal(scene.byteLength, 1_097_320 * 32);
  const record = new DataView(scene.buffer, scene.byteOffset, 32);
  assert.deepEqual([0, 1, 2].map((offset) => record.getFloat32(offset * 4, true)), [
    0.0203857421875, -0.1566162109375, -0.9091796875,
  ]);
  assert.ok([12, 16, 20].every((offset) => record.getFloat32(offset, true) > 0));
});

test('garden metadata supplies a valid initial camera view', async () => {
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  assert.deepEqual(initialViewFromMetadata(metadata), {
    position: [-3.264371395111084, -0.1436595916748047, -1.1631765365600586],
    center: [0, 0, 0],
  });
});

test('maps the captured vertical cubemap face order to Three.js order', () => {
  assert.deepEqual(cubeFaceIndices(['py', 'pz', 'ny', 'nx', 'px', 'nz']), [4, 3, 0, 2, 1, 5]);
  assert.throws(() => cubeFaceIndices(['py', 'pz', 'ny', 'nx', 'px', 'px']), /exactly once/);
});

test('skybox metadata describes the six-face vertical atlas', async () => {
  const skyboxMetadata = JSON.parse(await fs.readFile(
    new URL('../public/assets/garden-from-wall-skybox.json', import.meta.url),
    'utf8',
  ));
  assert.equal(skyboxMetadata.projection, 'vertical-cubemap-atlas');
  assert.deepEqual(cubeFaceIndices(skyboxMetadata.cubemap.order), [4, 3, 0, 2, 1, 5]);
  assert.ok((await fs.stat(new URL('../public/assets/garden-from-wall-skybox.jpg', import.meta.url))).size > 0);
});
