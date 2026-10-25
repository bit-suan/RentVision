# Feature: rentvision-platform, Property 9: Lease field extraction from text
"""
Property 9: Lease field extraction from text
For any lease text string that contains recognizable patterns
(e.g., "Monthly Rent: 45000", "Landlord: Hana Bekele"),
extract_fields(text) should return a LeaseExtractedData where the extracted
numeric fields match the values in the text and extracted string fields match
the names.

Validates: Requirements 5.5
"""

from hypothesis import given, settings
from hypothesis import strategies as st

from rentvision_ai.extraction import extract_fields


# Strategy for realistic positive integers (rent/deposit amounts)
rent_amounts = st.integers(min_value=1, max_value=9_999_999)

# Strategy for person names: two words, letters only, no digits or special chars
# that could confuse the regex (no colons, no newlines)
name_parts = st.text(
    alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
    min_size=2,
    max_size=15,
)
person_names = st.builds(lambda first, last: f"{first} {last}", name_parts, name_parts)


@given(rent=rent_amounts)
@settings(max_examples=100)
def test_monthly_rent_extracted_correctly(rent: int) -> None:
    """
    Property 9 (numeric): For any positive integer rent amount embedded in the
    canonical pattern "Monthly Rent: {n}", extract_fields returns monthly_rent == n.

    Validates: Requirements 5.5
    """
    text = f"Monthly Rent: {rent} ETB payable on the 1st of each month."
    result = extract_fields(text)
    assert result.monthly_rent == float(rent), (
        f"Expected monthly_rent={float(rent)}, got {result.monthly_rent} for rent={rent}"
    )


@given(deposit=rent_amounts)
@settings(max_examples=100)
def test_deposit_extracted_correctly(deposit: int) -> None:
    """
    Property 9 (numeric): For any positive integer deposit amount embedded in
    "Security Deposit: {n}", extract_fields returns deposit == n.

    Validates: Requirements 5.5
    """
    text = f"Security Deposit: {deposit} ETB held for the lease term."
    result = extract_fields(text)
    assert result.deposit == float(deposit), (
        f"Expected deposit={float(deposit)}, got {result.deposit} for deposit={deposit}"
    )


@given(name=person_names)
@settings(max_examples=100)
def test_landlord_name_extracted_correctly(name: str) -> None:
    """
    Property 9 (string): For any name embedded in "Landlord: {name}",
    extract_fields returns landlord_name == name.

    Validates: Requirements 5.5
    """
    text = f"Landlord: {name}\nMonthly Rent: 10000 ETB"
    result = extract_fields(text)
    assert result.landlord_name == name, (
        f"Expected landlord_name={name!r}, got {result.landlord_name!r}"
    )


@given(name=person_names)
@settings(max_examples=100)
def test_tenant_name_extracted_correctly(name: str) -> None:
    """
    Property 9 (string): For any name embedded in "Tenant: {name}",
    extract_fields returns tenant_name == name.

    Validates: Requirements 5.5
    """
    text = f"Tenant: {name}\nMonthly Rent: 10000 ETB"
    result = extract_fields(text)
    assert result.tenant_name == name, (
        f"Expected tenant_name={name!r}, got {result.tenant_name!r}"
    )


@given(rent=rent_amounts, landlord=person_names, tenant=person_names)
@settings(max_examples=100)
def test_combined_fields_extracted_correctly(rent: int, landlord: str, tenant: str) -> None:
    """
    Property 9 (combined): For any combination of rent, landlord name, and
    tenant name embedded together in lease text, extract_fields returns all
    three fields matching the generated values.

    Validates: Requirements 5.5
    """
    text = (
        f"Landlord: {landlord}\n"
        f"Tenant: {tenant}\n"
        f"Monthly Rent: {rent} ETB payable on the 5th of each month.\n"
    )
    result = extract_fields(text)
    assert result.monthly_rent == float(rent), (
        f"monthly_rent mismatch: expected {float(rent)}, got {result.monthly_rent}"
    )
    assert result.landlord_name == landlord, (
        f"landlord_name mismatch: expected {landlord!r}, got {result.landlord_name!r}"
    )
    assert result.tenant_name == tenant, (
        f"tenant_name mismatch: expected {tenant!r}, got {result.tenant_name!r}"
    )
