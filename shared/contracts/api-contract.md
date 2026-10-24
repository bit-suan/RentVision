# RentVision API Contract

## Conventions
- Base URL comes from an environment variable (never hardcoded).
- JSON in, JSON out. Timestamps are ISO 8601. Price is monthly rent. Distances are in km.
- Auth: `Authorization: Bearer <token>` (Cognito). For local dev only: `x-user-id: <id>` and `x-user-role: admin`.

## Errors (same shape everywhere)
```json
{ "error": { "code": "INVALID_RADIUS", "message": "radiusKm must be > 0 and <= 50" } }
```
Validation errors add `"details": [{ "path": "price", "message": "..." }]`.

| Status | Meaning |
|---|---|
| 400 | Invalid input |
| 401 | Not signed in |
| 403 | Not allowed (not the owner / not admin) |
| 404 | Not found (also used for hidden listings) |
| 409 | Already exists |
| 413 | File too large |
| 500 | Server error |

## Listing statuses
- `approved`: public, visible in search. New listings start here.
- `pending`: hidden, waiting for admin review. A listing moves here automatically when an added image is flagged as a duplicate or look-alike.
- `rejected`: hidden, set by an admin.

Hidden listings are visible only to their owner and admins.

## Listing object
```json
{
  "listingId": "uuid",
  "ownerId": "user id",
  "status": "approved",
  "title": "2-bedroom near Bole",
  "description": "Sunny apartment",
  "price": 15000,
  "bedrooms": 2,
  "address": "Bole, Addis Ababa",
  "lat": 9.0054,
  "lng": 38.7636,
  "panoramas": [
    {
      "id": "pano-1",
      "s3Key": "panoramas/abc.jpg",
      "label": "Living room",
      "hotspots": [
        { "id": "h1", "label": "Kitchen", "yaw": 45, "pitch": 0, "targetPanoramaId": "pano-2" }
      ]
    }
  ],
  "images": [],
  "createdAt": "2026-10-23T10:00:00Z",
  "updatedAt": "2026-10-23T10:00:00Z"
}
```
A hotspot's `targetPanoramaId` must match the `id` of a panorama in the same listing.

## Endpoints

| Method and path | Auth | Purpose |
|---|---|---|
| `GET /health` | none | Returns `{ "status": "ok", "time": "..." }` |
| `POST /listings` | signed in | Create a listing. Returns 201 with the listing. |
| `GET /listings/{id}` | none (owner/admin for hidden) | Get one listing with panoramas and hotspots. |
| `PUT /listings/{id}` | owner or admin | Update any subset of the create fields. Returns the listing. |
| `PATCH /listings/{id}/status` | admin | Review action. Body: `{ "status": "approved" }` |
| `GET /listings/search` | none | List and radius search (below). |
| `POST /listings/{id}/images` | owner or admin | Register an uploaded image and check for duplicates (below). |

### Create / update body
`title`, `description`, `price`, `bedrooms`, `address`, `lat`, `lng`, `panoramas` (optional).
Limits: `lat` -90..90, `lng` -180..180, `price` > 0, max 10 panoramas, max 20 hotspots each.

### GET /listings/search
Query params (all optional):

| Param | Notes |
|---|---|
| `lat`, `lng` | Both required together for radius search |
| `radiusKm` | Default 5, max 50 |
| `minPrice`, `maxPrice` | |
| `bedrooms` | Minimum number of bedrooms |
| `limit` | Default 20, max 50 |
| `offset` | Default 0 |
| `mine=true` | Only the signed-in user's listings, any status |

Response:
```json
{
  "total": 37,
  "count": 20,
  "limit": 20,
  "offset": 0,
  "center": { "lat": 9.0, "lng": 38.7, "radiusKm": 5 },
  "results": [
    {
      "listingId": "uuid",
      "title": "2-bedroom near Bole",
      "price": 15000,
      "bedrooms": 2,
      "address": "Bole, Addis Ababa",
      "lat": 9.0054,
      "lng": 38.7636,
      "status": "approved",
      "hasPanorama": true,
      "distanceKm": 1.234
    }
  ]
}
```
- With `lat`/`lng`: results are nearest first and include `distanceKm`.
- Without them: `center` is null, no `distanceKm`, newest first.
- `total` is all matches (for the "N results" label). `count` is the size of this page.

### POST /listings/{id}/images
The file is uploaded to S3 first (signed URL). This call sends only its key.

Body: `{ "s3Key": "images/abc.jpg" }`

Response (201):
```json
{
  "image": { "s3Key": "images/abc.jpg", "sha256": "...", "phash": "...", "addedAt": "..." },
  "warnings": [
    { "type": "exact_duplicate", "otherListingId": "uuid", "otherS3Key": "...", "hammingDistance": 0 }
  ],
  "listingStatus": "pending",
  "note": "Similarity is a signal for human review, not proof of fraud."
}
```
- `warnings[].type` is `exact_duplicate` or `visually_similar`.
- If `warnings` is not empty, the listing's status becomes `pending` and `listingStatus` says so. The UI should tell the landlord it is under review.

## Owned by other members (to add)
- Signed upload URL endpoint (Member 4)
- AI listing extraction and lease Q&A (Member 3)