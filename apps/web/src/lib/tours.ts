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

const LIVING = "/images/panoramas/living-room.jpg";
const BEDROOM = "/images/panoramas/bedroom.jpg";
const KITCHEN = "/images/panoramas/kitchen.jpg";
const DINING = "/images/panoramas/dining.jpg";
const BALCONY = "/images/panoramas/balcony.jpg";

export function getTour(listingId: string): { defaultSceneId: string; scenes: TourScene[] } {
  return {
    defaultSceneId: "living",
    scenes: [
      {
        id: "living",
        title: "Living Room",
        imageUrl: LIVING,
        hotspots: [
          {
            id: `${listingId}-to-bedroom`,
            pitch: -5,
            yaw: 42,
            text: "Walk to Master Bedroom",
            targetSceneId: "bedroom",
          },
          {
            id: `${listingId}-to-dining`,
            pitch: -3,
            yaw: -60,
            text: "Walk to Dining Area",
            targetSceneId: "dining",
          },
          {
            id: `${listingId}-to-kitchen`,
            pitch: -4,
            yaw: -110,
            text: "Walk to Kitchen",
            targetSceneId: "kitchen",
          },
        ],
      },
      {
        id: "bedroom",
        title: "Master Bedroom",
        imageUrl: BEDROOM,
        hotspots: [
          {
            id: `${listingId}-bed-to-living`,
            pitch: -6,
            yaw: -140,
            text: "Back to Living Room",
            targetSceneId: "living",
          },
          {
            id: `${listingId}-bed-to-balcony`,
            pitch: -2,
            yaw: 75,
            text: "Step out to Balcony",
            targetSceneId: "balcony",
          },
        ],
      },
      {
        id: "kitchen",
        title: "Modern Kitchen",
        imageUrl: KITCHEN,
        hotspots: [
          {
            id: `${listingId}-kitch-to-dining`,
            pitch: -4,
            yaw: 50,
            text: "Walk to Dining Room",
            targetSceneId: "dining",
          },
          {
            id: `${listingId}-kitch-to-living`,
            pitch: -3,
            yaw: 130,
            text: "Back to Living Room",
            targetSceneId: "living",
          },
        ],
      },
      {
        id: "dining",
        title: "Dining Hall",
        imageUrl: DINING,
        hotspots: [
          {
            id: `${listingId}-din-to-kitchen`,
            pitch: -5,
            yaw: -120,
            text: "Enter Kitchen",
            targetSceneId: "kitchen",
          },
          {
            id: `${listingId}-din-to-living`,
            pitch: -4,
            yaw: 35,
            text: "Return to Living Room",
            targetSceneId: "living",
          },
          {
            id: `${listingId}-din-to-balcony`,
            pitch: -2,
            yaw: -45,
            text: "Open Balcony",
            targetSceneId: "balcony",
          },
        ],
      },
      {
        id: "balcony",
        title: "Scenic Balcony & Terrace",
        imageUrl: BALCONY,
        hotspots: [
          {
            id: `${listingId}-balc-to-bedroom`,
            pitch: -6,
            yaw: -80,
            text: "Enter Master Bedroom",
            targetSceneId: "bedroom",
          },
          {
            id: `${listingId}-balc-to-dining`,
            pitch: -4,
            yaw: 100,
            text: "Enter Dining Room",
            targetSceneId: "dining",
          },
        ],
      },
    ],
  };
}
