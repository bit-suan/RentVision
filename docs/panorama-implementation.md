# RentVision Panorama Implementation

This document describes how RentVision supports interactive 360-degree
property tours across the frontend, backend, AWS infrastructure, and storage
layers.

## Scope

RentVision currently targets **360-degree panorama tours**, not a full
three-dimensional property model.

A panorama tour consists of:

- Equirectangular 360-degree images
- One scene per room or area
- A default scene
- Hotspots that navigate between scenes
- Private S3 storage
- Temporary signed URLs for viewing
- Pannellum in the browser for rendering

Files such as `.glb`, `.gltf`, `.obj`, or `.fbx` and a free-movement 3D
environment are not currently part of the implementation.

## User flow

### Landlord flow

1. The landlord creates a property listing.
2. The frontend requests an upload URL for each panorama:

   ```http
   POST /media/upload-url
   ```

3. The backend returns a short-lived presigned S3 URL and an object key.
4. The browser uploads the panorama directly to S3.
5. The landlord assigns a room name to the uploaded panorama.
6. The landlord configures hotspots, including their position, label, and
   destination room.
7. The frontend submits the panorama metadata with the listing.
8. The backend validates and stores the metadata.

### Renter flow

1. The renter searches for a property, optionally using the geospatial search.
2. The renter opens the listing details page.
3. The frontend requests the listing:

   ```http
   GET /listings/{id}
   ```

4. The backend reads the listing and panorama metadata.
5. The backend creates temporary download URLs for the panorama objects.
6. The frontend passes the scenes and URLs to Pannellum.
7. The renter looks around the current 360-degree image.
8. The renter clicks a hotspot to move to another room.

## Architecture

```text
Landlord browser
      |
      | POST /media/upload-url
      v
Media Lambda
      |
      | presigned PUT URL
      v
Private S3 property-media bucket

Landlord browser
      |
      | listing metadata and hotspot configuration
      v
Listings Lambda
      |
      v
DynamoDB properties table

Renter browser
      |
      | GET /listings/{id}
      v
Listings Lambda
      |
      +--> DynamoDB: scene metadata and S3 keys
      |
      +--> Media/S3 signing: temporary download URLs
      v
Pannellum viewer
```

The AWS resources are composed by
[rentvision-stack.ts](../infra/lib/rentvision-stack.ts). The relevant
constructs are:

- [api-construct.ts](../infra/lib/constructs/api-construct.ts): API Gateway,
  Lambda functions, routes, and permissions
- [s3-construct.ts](../infra/lib/constructs/s3-construct.ts): private media
  bucket and CORS configuration
- [dynamodb-construct.ts](../infra/lib/constructs/dynamodb-construct.ts):
  listing persistence and indexes

## Panorama files in S3

Panorama objects use the following key convention:

```text
listings/{listingId}/panoramas/{uuid}_{filename}
```

Example:

```text
listings/listing-bole-loft/panoramas/4a8c_living-room.jpg
```

The bucket is private. The application should not store permanent public URLs
or permanent signed URLs in listing records.

The database stores the stable `s3Key`. A temporary `imageUrl` is generated
when the renter requests the listing.

## Upload flow

The media Lambda accepts panorama uploads through
[media.ts](../services/api/src/handlers/media.ts).

The request is:

```json
{
  "listingId": "listing-bole-loft",
  "fileName": "living-room.jpg",
  "mediaType": "panorama",
  "contentType": "image/jpeg"
}
```

The handler:

1. Validates `listingId`, `fileName`, `mediaType`, and `contentType`.
2. Sanitizes the file name.
3. Creates a key under the listing's `panoramas` folder.
4. Requests a presigned S3 upload URL.
5. Returns the URL, key, and expiration time.

Example response:

```json
{
  "uploadUrl": "https://signed-upload-url.example",
  "fileKey": "listings/listing-bole-loft/panoramas/4a8c_living-room.jpg",
  "expiresIn": 900
}
```

The browser then uploads the image directly to S3 using HTTP `PUT`. The image
does not need to pass through API Gateway or Lambda.

## Stored panorama model

The intended structured model is:

```json
{
  "defaultSceneId": "living-room",
  "scenes": [
    {
      "id": "living-room",
      "title": "Living room",
      "s3Key": "listings/listing-bole-loft/panoramas/living-room.jpg",
      "hotspots": [
        {
          "id": "living-to-bedroom",
          "pitch": -8,
          "yaw": 40,
          "text": "Go to bedroom",
          "targetSceneId": "bedroom"
        }
      ]
    },
    {
      "id": "bedroom",
      "title": "Bedroom",
      "s3Key": "listings/listing-bole-loft/panoramas/bedroom.jpg",
      "hotspots": []
    }
  ]
}
```

The existing shared contract uses similar scene and hotspot concepts in
[panorama.ts](../shared/contracts/src/panorama.ts), while the current Lambda
listing type still uses `panoramaKeys` in
[types/index.ts](../services/api/src/types/index.ts). These models need to be
reconciled before production panorama metadata is persisted.

## Validation rules

When structured panorama metadata is connected to listing create/update
requests, the backend should enforce:

- No more than 10 scenes per listing
- No more than 20 hotspots per scene
- Scene IDs are unique within a listing
- Hotspot IDs are unique within a scene
- `defaultSceneId` references an existing scene
- Every `targetSceneId` references an existing scene in the same listing
- Every panorama key belongs to the listing
- Panorama keys use the listing's `panoramas` path
- `pitch` and `yaw` are finite numeric values

For example, a hotspot targeting a nonexistent room must be rejected instead
of being saved:

```json
{
  "error": {
    "code": "INVALID_PANORAMA",
    "message": "Hotspot targetSceneId must reference a scene in the same listing"
  }
}
```

## Download flow

The media Lambda also supports:

```http
GET /media/download-url?fileKey=listings/{listingId}/panoramas/{key}
```

It returns a temporary signed S3 URL that the browser can use to load the
panorama:

```json
{
  "downloadUrl": "https://signed-download-url.example",
  "expiresIn": 3600
}
```

The URL is intentionally temporary because the S3 bucket is private.

The preferred listing-detail behavior is:

1. Read stored scene metadata from DynamoDB.
2. Generate a download URL for each scene's `s3Key`.
3. Return `imageUrl` to the frontend.
4. Keep `s3Key` as the persisted value.

## Frontend rendering

The viewer is implemented in
[PanoramaViewer.tsx](../apps/web/src/components/PanoramaViewer.tsx).

It converts each scene into Pannellum configuration:

```ts
{
  title: scene.title,
  type: "equirectangular",
  panorama: scene.imageUrl,
  hotSpots: scene.hotspots.map((hotspot) => ({
    pitch: hotspot.pitch,
    yaw: hotspot.yaw,
    type: hotspot.targetSceneId ? "scene" : "info",
    text: hotspot.text,
    sceneId: hotspot.targetSceneId
  }))
}
```

Pannellum then:

- Loads the selected equirectangular image
- Allows mouse, touch, and zoom interaction
- Displays informational hotspots
- Navigates to another scene for scene hotspots

## Current implementation status

### Implemented

- Private S3 property-media bucket
- Panorama S3 key convention
- Presigned panorama upload URL generation
- Presigned panorama download URL generation
- API Gateway media routes
- Pannellum viewer
- Scene and hotspot rendering
- Demo tour data and room-to-room navigation

### Implemented in the deployed listing handler path

- Structured scenes and hotspots are supported on the Lambda listing type.
- Panorama metadata is validated on listing create/update.
- Panorama metadata is persisted with the listing.
- `PUT /listings/{id}` is registered in the CDK API construct.
- Listing detail responses include temporary `imageUrl` values for panorama
  scenes.
- Listing creation uses the authenticated local actor or API Gateway claims
  for the landlord ID instead of trusting a request-body landlord ID.
- Owner/admin checks protect listing updates and media upload URL generation.
- Focused handler tests cover valid metadata, invalid hotspot targets,
  persistence, and signed local download URLs.

### Still required for complete end-to-end integration

- Replace hard-coded demo tour data with API data.
- Add a landlord panorama configuration/upload interface.
- Enforce Cognito owner/admin authorization on listing updates.
- Confirm the deployed API route and environment configuration in AWS.
- Resolve the existing API TypeScript `rootDir` conflict caused by legacy
  imports from `shared/contracts`.

The current demo tour data is in
[tours.ts](../apps/web/src/lib/tours.ts) and uses example Pannellum images.
This demonstrates the viewer, but it is not yet the production S3-backed
listing flow.

## True 3D models

True 3D support would be a separate feature. It would require:

- A model upload type such as `.glb` or `.gltf`
- A separate S3 model key
- Model size and content validation
- A signed download URL
- Three.js, React Three Fiber, or Babylon.js
- Camera and orbit controls
- Lighting and model loading
- Collision and navigation rules
- Mobile performance handling

The current panorama implementation should not be described as a true 3D
model viewer. It is an interactive 360-degree image tour with scene
navigation.

## Testing checklist

### Backend

- Request a panorama upload URL with a supported image type.
- Confirm the returned key is under the listing's `panoramas` folder.
- Upload the image to S3 using the returned URL.
- Save valid scene and hotspot metadata.
- Reject an unknown `targetSceneId`.
- Reject duplicate scene IDs.
- Reject more than 10 scenes.
- Reject more than 20 hotspots in one scene.
- Retrieve the listing and confirm signed panorama URLs are returned.

### Frontend

- Open a listing with panorama scenes.
- Confirm the first scene is the configured default scene.
- Drag to look around.
- Use a hotspot to navigate to another scene.
- Confirm an unavailable or expired image shows an error/fallback state.
- Test the viewer on desktop and mobile layouts.
