# Feature: rentvision-platform, Property 10: Pydantic model serialization round-trip
"""
Property 10: Pydantic model serialization round-trip
For any instance of LeaseExtractionResult, LeaseQAAnswer, or ListingAssistResponse,
calling model.model_dump() and then Model.model_validate(data) should produce a
model instance equal to the original.

Validates: Requirements 5.6
"""

from hypothesis import given, settings
from hypothesis import strategies as st

from rentvision_ai.models import (
    LeaseExtractedData,
    LeaseExtractionResult,
    LeaseQAAnswer,
    ListingAssistResponse,
)

# ---------------------------------------------------------------------------
# Shared primitive strategies
# ---------------------------------------------------------------------------

text_st = st.text(min_size=0, max_size=200)
nonempty_text_st = st.text(min_size=1, max_size=200)
optional_text_st = st.one_of(st.none(), text_st)
optional_float_st = st.one_of(st.none(), st.floats(min_value=0, max_value=1_000_000, allow_nan=False, allow_infinity=False))
optional_int_st = st.one_of(st.none(), st.integers(min_value=1, max_value=9999))
confidence_st = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)
terms_st = st.lists(text_st, min_size=0, max_size=5)

# ---------------------------------------------------------------------------
# Composite strategies for each model
# ---------------------------------------------------------------------------

@st.composite
def lease_extracted_data_st(draw):
    return LeaseExtractedData(
        start_date=draw(optional_text_st),
        end_date=draw(optional_text_st),
        monthly_rent=draw(optional_float_st),
        deposit=draw(optional_float_st),
        terms=draw(terms_st),
        landlord_name=draw(optional_text_st),
        tenant_name=draw(optional_text_st),
    )


@st.composite
def lease_extraction_result_st(draw):
    return LeaseExtractionResult(
        lease_id=draw(nonempty_text_st),
        page_count=draw(st.integers(min_value=1, max_value=500)),
        text=draw(text_st),
        extracted=draw(lease_extracted_data_st()),
    )


@st.composite
def lease_qa_answer_st(draw):
    return LeaseQAAnswer(
        lease_id=draw(nonempty_text_st),
        question=draw(nonempty_text_st),
        answer=draw(text_st),
        confidence=draw(confidence_st),
        source_page=draw(optional_int_st),
    )


@st.composite
def listing_assist_response_st(draw):
    return ListingAssistResponse(
        suggested_title=draw(nonempty_text_st),
        suggested_description=draw(text_st),
        highlights=draw(st.lists(text_st, min_size=0, max_size=10)),
    )


# ---------------------------------------------------------------------------
# Property tests
# ---------------------------------------------------------------------------

@given(instance=lease_extraction_result_st())
@settings(max_examples=100)
def test_lease_extraction_result_round_trip(instance: LeaseExtractionResult) -> None:
    """
    Property 10: For any LeaseExtractionResult, serializing with model_dump()
    and deserializing with model_validate() produces an equal instance.

    Validates: Requirements 5.6
    """
    data = instance.model_dump()
    restored = LeaseExtractionResult.model_validate(data)
    assert restored == instance, (
        f"Round-trip failed for LeaseExtractionResult.\nOriginal: {instance}\nRestored: {restored}"
    )


@given(instance=lease_qa_answer_st())
@settings(max_examples=100)
def test_lease_qa_answer_round_trip(instance: LeaseQAAnswer) -> None:
    """
    Property 10: For any LeaseQAAnswer, serializing with model_dump()
    and deserializing with model_validate() produces an equal instance.

    Validates: Requirements 5.6
    """
    data = instance.model_dump()
    restored = LeaseQAAnswer.model_validate(data)
    assert restored == instance, (
        f"Round-trip failed for LeaseQAAnswer.\nOriginal: {instance}\nRestored: {restored}"
    )


@given(instance=listing_assist_response_st())
@settings(max_examples=100)
def test_listing_assist_response_round_trip(instance: ListingAssistResponse) -> None:
    """
    Property 10: For any ListingAssistResponse, serializing with model_dump()
    and deserializing with model_validate() produces an equal instance.

    Validates: Requirements 5.6
    """
    data = instance.model_dump()
    restored = ListingAssistResponse.model_validate(data)
    assert restored == instance, (
        f"Round-trip failed for ListingAssistResponse.\nOriginal: {instance}\nRestored: {restored}"
    )
