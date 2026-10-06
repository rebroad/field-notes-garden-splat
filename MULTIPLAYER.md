# Multiplayer game design around splats

Treat the Gaussian-splat scene as immutable visual content, not as the game
world's source of truth. Render it locally with Spark; represent collision,
navigation, player state, and game rules separately.

## Suggested system split

- **Static asset delivery:** versioned scene manifests and content-hashed
  SPZ/SOG chunks on a CDN or object store.
- **Room service:** authoritative movement, interactions, inventory, and
  match rules over WebSocket or WebTransport.
- **Persistence:** accounts, durable progression, room records, and optional
  replay/audit events.
- **Client:** Spark renderer, a low-poly collision proxy, prediction for the
  local player, and interpolation for remote players.

Splat appearance is not reliable collision geometry. Create a separate
collision mesh and navmesh, then version them alongside the scene manifest.

## Protocol sketch

```text
HTTPS  GET /scenes/garden-v1/manifest.json
       -> renderer/format version, splat chunks, collision, navmesh, spawns

WS     client -> {type:"input", seq, buttons, move, look, dt}
       server -> {type:"snapshot", tick, ack, players, events}
       server -> {type:"event", tick, kind, payload}
```

Clients send input intentions, not trusted positions or scores. The server
validates commands and emits authoritative snapshots. Sequence numbers support
acknowledgement and reconciliation; server ticks define event order. Quantize
state only where the resulting precision remains acceptable.

## Bandwidth and scale

Cache immutable scene assets by content hash. Do not proxy splat bytes through
the room server. Partition rooms into spatial cells and publish nearby player
state plus a small neighbouring margin. Keep global events separate. Use
short-lived scoped room tokens and bound message size, rate, and room fan-out.

## First vertical slice

Start with one static scene, two clients, a hand-authored collision proxy,
server-authoritative movement at a fixed tick rate, interpolation, one
reliable interaction event, and reconnect via a full state snapshot. Only
then add persistence, large rooms, or dynamic scene changes.
