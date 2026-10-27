export interface PhotoItem {
  id: string;
  name: string;
  size?: number;
  kind: "existing" | "new";
  file?: File;
  key?: string;
  previewUrl: string;
}

export interface HotspotItem {
  id: string;
  pitch: string;
  yaw: string;
  text: string;
  targetSceneId: string;
}

export interface SceneItem {
  id: string;
  title: string;
  kind: "existing" | "new";
  file?: File;
  s3Key?: string;
  previewUrl?: string;
  hotspots: HotspotItem[];
}

export interface UploadFailure {
  label: string;
  message: string;
}
