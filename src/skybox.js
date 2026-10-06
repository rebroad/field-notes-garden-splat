import * as THREE from 'three';

const THREE_FACE_ORDER = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
// Luma's background shader samples the cubemap with the negated direction used
// by Three.js's CubeTexture background shader. Map each face to its opposite,
// and mirror its pixels to preserve the same sample direction within that face.
const CAPTURE_FACE_FOR_THREE = {
  px: { face: 'nx', flipX: false, flipY: true },
  nx: { face: 'px', flipX: false, flipY: true },
  py: { face: 'ny', flipX: true, flipY: false },
  ny: { face: 'py', flipX: true, flipY: false },
  pz: { face: 'nz', flipX: false, flipY: true },
  nz: { face: 'pz', flipX: false, flipY: true },
};

export function cubeFaceIndices(atlasOrder) {
  if (!Array.isArray(atlasOrder)
    || atlasOrder.length !== THREE_FACE_ORDER.length
    || new Set(atlasOrder).size !== THREE_FACE_ORDER.length
    || THREE_FACE_ORDER.some((face) => !atlasOrder.includes(face))) {
    throw new Error('Skybox face order must contain px, nx, py, ny, pz, and nz exactly once.');
  }
  return THREE_FACE_ORDER.map((face) => atlasOrder.indexOf(CAPTURE_FACE_FOR_THREE[face].face));
}

export function cubeFaceTransforms(atlasOrder) {
  cubeFaceIndices(atlasOrder);
  return THREE_FACE_ORDER.map((face) => ({
    sourceIndex: atlasOrder.indexOf(CAPTURE_FACE_FOR_THREE[face].face),
    flipX: CAPTURE_FACE_FOR_THREE[face].flipX,
    flipY: CAPTURE_FACE_FOR_THREE[face].flipY,
  }));
}

export function cubeTextureFromAtlas(image, atlasOrder) {
  const transforms = cubeFaceTransforms(atlasOrder);
  const faceSize = image.naturalWidth || image.width;
  const imageHeight = image.naturalHeight || image.height;
  if (!faceSize || imageHeight !== faceSize * transforms.length) {
    throw new Error('Skybox image must be a vertical atlas of six square faces.');
  }

  const faces = transforms.map(({ sourceIndex, flipX, flipY }) => {
    const canvas = document.createElement('canvas');
    canvas.width = faceSize;
    canvas.height = faceSize;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create a canvas for the skybox.');
    context.setTransform(flipX ? -1 : 1, 0, 0, flipY ? -1 : 1, flipX ? faceSize : 0, flipY ? faceSize : 0);
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
