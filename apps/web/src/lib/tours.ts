export interface TourScene {
  id: string;
  title: string;
  imageUrl: string;
  hotspots: Array<{
    id: string;
    pitch: number;
    yaw: number;
    text: string;
    targetSceneId?: string;
  }>;
}

const LIVING =
  "https://pannellum.org/images/alma.jpg";
const SECOND =
  "https://pannellum.org/images/jfk.jpg";

export function getTour(listingId: string): { defaultSceneId: string; scenes: TourScene[] } {
  return {
    defaultSceneId: "living",
    scenes: [
      {
        id: "living",
        title: "Living room",
        imageUrl: LIVING,
        hotspots: [
          {
            id: `${listingId}-to-bedroom`,
            pitch: -8,
            yaw: 40,
            text: "Go to bedroom",
            targetSceneId: "bedroom",
          },
        ],
      },
      {
        id: "bedroom",
        title: "Bedroom",
        imageUrl: SECOND,
        hotspots: [
          {
            id: `${listingId}-to-living`,
            pitch: -4,
            yaw: -120,
            text: "Back to living room",
            targetSceneId: "living",
          },
        ],
      },
    ],
  };
}
