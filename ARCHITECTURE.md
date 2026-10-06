# Viewer architecture

## Runtime

This is a static browser app. It has no application backend and makes no
requests to a scene provider. The page fetches its scene and small camera
metadata files from the same site, then loads the renderer on demand.

```text
Browser
  ├── index.html + src/style.css  original responsive interface
  ├── src/main.js                 local scene selection and auto-load
  ├── src/capture-view.js         initial camera pose
  └── Spark + Three.js             standard .splat renderer
```

The bundled garden asset is a standard 32-byte-record `.splat` file. Spark
loads it in the browser and renders it with WebGL. Scene bytes are not proxied
through an application server. The garden starts automatically; other open
formats may be selected from local storage.

## Performance choices

The app avoids a framework and UI component library. The renderer is dynamically
imported after page load, and device pixel ratio is capped at 1.5 to limit
mobile fill-rate and memory use. The scene is delivered in an interoperable,
uncompressed format; the 35 MB transfer is a deliberate trade-off for a simple
static host and broad renderer support.

## Multiplayer direction

Treat the splat as immutable visual content, not as the game's source of truth.
Keep collision, navigation, player state, and game rules separate. See
[MULTIPLAYER.md](MULTIPLAYER.md) for a suggested client, room-service, and
asset-delivery split.
