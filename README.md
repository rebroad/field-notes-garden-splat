# Field Notes — Garden from Wall

A de-branded, browser-based Gaussian-splat demo. It opens directly into the
garden scene, rendered with Spark and Three.js. The included scene is a
standard `.splat` file; the public app does not include or run a Luma decoder,
backend, account integration, or third-party webpage assets.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

The garden loads automatically. Choose **Open scene** to replace it with an
`.spz`, `.ply`, `.splat`, `.ksplat`, or `.sog` file. To build and preview the
static site:

```sh
npm test
npm run build
npm run preview
```

## GitHub Pages

Controls: drag to orbit; hold Shift while dragging, or drag with two fingers,
to pan; pinch to zoom; tap a visible part of the scene to center it.

Pushes to `main` run tests and deploy the static build. Relative asset paths
support the project Pages URL. The published viewer and garden scene are
publicly downloadable; the working/research repository remains separate.

The garden scene contains about 1.1 million splats and is approximately 35 MB
uncompressed. Browser loading and rendering performance depends on the device.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the renderer design,
[MULTIPLAYER.md](MULTIPLAYER.md) for a future multiplayer architecture, and
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution and licensing.
