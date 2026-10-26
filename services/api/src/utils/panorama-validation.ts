import { PanoramaTour } from '../types';

const MAX_SCENES = 10;
const MAX_HOTSPOTS_PER_SCENE = 20;

export function validatePanorama(
  panorama: unknown,
  listingId: string
): asserts panorama is PanoramaTour {
  if (!panorama || typeof panorama !== 'object') {
    throw new Error('panorama must be an object');
  }

  const value = panorama as Partial<PanoramaTour>;
  if (typeof value.defaultSceneId !== 'string' || !value.defaultSceneId.trim()) {
    throw new Error('panorama.defaultSceneId is required');
  }
  if (!Array.isArray(value.scenes) || value.scenes.length === 0) {
    throw new Error('panorama.scenes must contain at least one scene');
  }
  if (value.scenes.length > MAX_SCENES) {
    throw new Error(`panorama.scenes cannot contain more than ${MAX_SCENES} scenes`);
  }

  const sceneIds = new Set<string>();
  for (const scene of value.scenes) {
    if (!scene || typeof scene !== 'object') {
      throw new Error('Each panorama scene must be an object');
    }
    if (
      typeof scene.id !== 'string' ||
      !scene.id.trim() ||
      sceneIds.has(scene.id)
    ) {
      throw new Error('Panorama scene IDs must be unique and non-empty');
    }
    sceneIds.add(scene.id);

    if (typeof scene.title !== 'string' || !scene.title.trim()) {
      throw new Error(`Panorama scene '${scene.id}' requires a title`);
    }
    if (
      typeof scene.s3Key !== 'string' ||
      !scene.s3Key.startsWith(`listings/${listingId}/panoramas/`)
    ) {
      throw new Error(
        `Panorama scene '${scene.id}' must use an S3 key under this listing's panoramas folder`
      );
    }
    if (!Array.isArray(scene.hotspots)) {
      throw new Error(`Panorama scene '${scene.id}' hotspots must be an array`);
    }
    if (scene.hotspots.length > MAX_HOTSPOTS_PER_SCENE) {
      throw new Error(
        `Panorama scene '${scene.id}' cannot contain more than ${MAX_HOTSPOTS_PER_SCENE} hotspots`
      );
    }

    const hotspotIds = new Set<string>();
    for (const hotspot of scene.hotspots) {
      if (
        !hotspot ||
        typeof hotspot.id !== 'string' ||
        !hotspot.id.trim() ||
        hotspotIds.has(hotspot.id)
      ) {
        throw new Error(
          `Panorama scene '${scene.id}' hotspot IDs must be unique and non-empty`
        );
      }
      hotspotIds.add(hotspot.id);

      if (
        typeof hotspot.text !== 'string' ||
        !hotspot.text.trim() ||
        typeof hotspot.pitch !== 'number' ||
        !Number.isFinite(hotspot.pitch) ||
        typeof hotspot.yaw !== 'number' ||
        !Number.isFinite(hotspot.yaw)
      ) {
        throw new Error(`Panorama scene '${scene.id}' contains an invalid hotspot`);
      }
    }
  }

  if (!sceneIds.has(value.defaultSceneId)) {
    throw new Error('panorama.defaultSceneId must reference an existing scene');
  }

  for (const scene of value.scenes) {
    for (const hotspot of scene.hotspots) {
      if (hotspot.targetSceneId && !sceneIds.has(hotspot.targetSceneId)) {
        throw new Error(
          `Hotspot '${hotspot.id}' must target a scene in the same listing`
        );
      }
    }
  }
}
