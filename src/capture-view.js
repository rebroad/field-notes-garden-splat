export function initialViewFromMetadata(metadata) {
  const pose = metadata?.camera?.initial_pose?.[0];
  const position = pose?.length === 4 ? pose.slice(0, 3).map((row) => row?.[3]) : undefined;
  if (!position || position.length !== 3 || !position.every(Number.isFinite)) return undefined;

  return { position, center: [0, 0, 0] };
}
