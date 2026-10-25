from rentvision_ai.assist import assist_listing
from rentvision_ai.extraction import extract_fields, store_extracted_text
from rentvision_ai.models import ListingAssistRequest
from rentvision_ai.qa import answer_question


def test_extracts_rent_and_parties() -> None:
    text = "Landlord: Hana Bekele\nMonthly Rent: 45000 ETB\nSecurity Deposit: 45000 ETB"
    extracted = extract_fields(text)
    assert extracted.landlord_name == "Hana Bekele"
    assert extracted.monthly_rent == 45000


def test_answers_from_matching_clause() -> None:
    store_extracted_text(
        "lease-1",
        "Monthly Rent: 45000 ETB payable on or before the 5th of each month.",
    )
    result = answer_question("lease-1", "When is monthly rent due?")
    assert "45000" in result.answer
    assert result.confidence > 0.4


def test_listing_assist_adds_location() -> None:
    result = assist_listing(
        ListingAssistRequest(
            title="Two bedroom loft",
            description="Sunny apartment with fiber internet.",
            subcity="Bole",
        )
    )
    assert "Bole" in result.suggested_title
