/**
 * Clickable navigation hotspot inside a 360° panorama.
 */
export interface PanoramaHotspot {
  id: string;
  pitch: number;
  yaw: number;
  text: string;
  targetSceneId?: string;
}

/**
 * A single equirectangular room scene in a virtual tour.
 */
export interface PanoramaScene {
  id: string;
  title: string;
  imageUrl: string;
  hotspots: PanoramaHotspot[];
}

/**
 * Virtual tour payload returned to the web client.
 */
export interface VirtualTour {
  listingId: string;
  defaultSceneId: string;
  scenes: PanoramaScene[];
}
