from pydantic import BaseModel, ConfigDict, Field


class LeaseExtractedData(BaseModel):
    start_date: str | None = None
    end_date: str | None = None
    monthly_rent: float | None = None
    deposit: float | None = None
    terms: list[str] = Field(default_factory=list)
    landlord_name: str | None = None
    tenant_name: str | None = None


class LeaseExtractionResult(BaseModel):
    lease_id: str
    page_count: int
    text: str
    extracted: LeaseExtractedData


class LeaseQARequest(BaseModel):
    question: str = Field(min_length=1)


class LeaseQAAnswer(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    lease_id: str
    question: str
    answer: str
    confidence: float = Field(ge=0, le=1)
    source_page: int | None = Field(default=None, alias="sourcePage")


class ListingAssistRequest(BaseModel):
    title: str
    description: str
    subcity: str | None = None


class ListingAssistResponse(BaseModel):
    suggested_title: str
    suggested_description: str
    highlights: list[str]
