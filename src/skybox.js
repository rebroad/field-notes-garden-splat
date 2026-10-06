import * as THREE from 'three';

const THREE_FACE_ORDER = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];

export function cubeFaceIndices(atlasOrder) {
  if (!Array.isArray(atlasOrder)
    || atlasOrder.length !== THREE_FACE_ORDER.length
    || new Set(atlasOrder).size !== THREE_FACE_ORDER.length
    || THREE_FACE_ORDER.some((face) => !atlasOrder.includes(face))) {
    throw new Error('Skybox face order must contain px, nx, py, ny, pz, and nz exactly once.');
  }
  return THREE_FACE_ORDER.map((face) => atlasOrder.indexOf(face));
}

export function cubeTextureFromAtlas(image, atlasOrder) {
  const indices = cubeFaceIndices(atlasOrder);
  const faceSize = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  if (!faceSize || imageHeight !== faceSize * indices.length) {
    throw new Error('Skybox image must be a vertical atlas of six square faces.');
  }

  const faces = indices.map((sourceIndex) => {
    const canvas = document.createElement('canvas');
    canvas.width = faceSize;
    canvas.height = faceSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create a canvas for the skybox.');
    context.drawImage(image, 0, sourceIndex * faceSize, faceSize, faceSize, 0, 0, faceSize, faceSize);
    return canvas;
  });

  const texture = new THREE.CubeTexture(faces);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function loadSkybox(url, atlasOrder) {
  return new Promise((resolve, reject) => {
    new THREE.ImageLoader().load(
      url,
      (image) => {
        try {
          resolve(cubeTextureFromAtlas(image, atlasOrder));
        } catch (error) {
          reject(error);
        }
      },
      undefined,
      reject,
    );
  });
}
