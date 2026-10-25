from rentvision_ai.models import ListingAssistRequest, ListingAssistResponse


def assist_listing(payload: ListingAssistRequest) -> ListingAssistResponse:
    location = payload.subcity or "Addis Ababa"
    title = payload.title.strip()
    if location.lower() not in title.lower():
        title = f"{title} in {location}"

    description = payload.description.strip()
    if "ETB" not in description and "rent" not in description.lower():
        description = f"{description} Located in {location}, this rental is listed for long-term occupancy."

    highlights = [
        f"Neighborhood: {location}",
        "Ask for a 360° tour before visiting in person",
        "Review the lease deposit, notice period, and utilities in writing",
    ]
    return ListingAssistResponse(
        suggested_title=title,
        suggested_description=description,
        highlights=highlights,
    )
