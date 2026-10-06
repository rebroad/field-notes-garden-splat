import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import { initialViewFromMetadata } from '../src/capture-view.js';
import { cubeFaceIndices, cubeFaceTransforms } from '../src/skybox.js';

const scenePath = new URL('../public/assets/garden-from-wall.spz', import.meta.url);
const metadataPath = new URL('../public/assets/garden-from-wall.json', import.meta.url);

test('garden asset is a compressed open SPZ file', async () => {
  const scene = await fs.readFile(scenePath);
  const header = gunzipSync(scene);
  assert.equal(header.toString('ascii', 0, 4), 'NGSP');
  assert.equal(header.readUInt32LE(4), 2);
  assert.equal(header.readUInt32LE(8), 1_097_320);
  assert.ok(scene.byteLength < 16_000_000, `SPZ should stay below 16 MB, got ${scene.byteLength}`);
});

test('garden metadata supplies a valid initial camera view', async () => {
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  assert.deepEqual(initialViewFromMetadata(metadata), {
    position: [-3.264371395111084, -0.1436595916748047, -1.1631765365600586],
    center: [0, 0, 0],
  });
});

test('maps the captured vertical cubemap face order to Three.js order', () => {
  const order = ['py', 'pz', 'ny', 'nx', 'px', 'nz'];
  assert.deepEqual(cubeFaceIndices(order), [3, 4, 2, 0, 5, 1]);
  assert.deepEqual(cubeFaceTransforms(order), [
    { sourceIndex: 3, flipX: false, flipY: true },
    { sourceIndex: 4, flipX: false, flipY: true },
    { sourceIndex: 2, flipX: true, flipY: false },
    { sourceIndex: 0, flipX: true, flipY: false },
    { sourceIndex: 5, flipX: false, flipY: true },
    { sourceIndex: 1, flipX: false, flipY: true },
  ]);
  assert.throws(() => cubeFaceIndices(['py', 'pz', 'ny', 'nx', 'px', 'px']), /exactly once/);
});

test('skybox metadata describes the six-face vertical atlas', async () => {
  const skyboxMetadata = JSON.parse(await fs.readFile(
    new URL('../public/assets/garden-from-wall-skybox.json', import.meta.url),
    'utf8',
  ));
  assert.equal(skyboxMetadata.projection, 'vertical-cubemap-atlas');
  assert.deepEqual(cubeFaceIndices(skyboxMetadata.cubemap.order), [3, 4, 2, 0, 5, 1]);
  assert.ok((await fs.stat(new URL('../public/assets/garden-from-wall-skybox.jpg', import.meta.url))).size > 0);
});
