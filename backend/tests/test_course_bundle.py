from app.services.course_bundle import apply_bundle_cents, bundle_quote, is_hidden_public_title, price_cents_for


def test_a1_starts_at_55k() -> None:
    assert price_cents_for("german-a1-zero-to-beginner", "beginner") == 5_500_000
    assert price_cents_for("german-c2-advanced", "advanced") == 15_000_000
    assert price_cents_for("unknown-beginner", "beginner") == 5_500_000


def test_bundle_a1_to_b2_is_15() -> None:
    slugs = [
        "german-a1-zero-to-beginner",
        "german-a2-beginner",
        "german-b1-beginner",
        "german-b2-beginner",
    ]
    quote = bundle_quote(slugs)
    assert quote["percent"] == 15
    assert quote["label"] == "A1 to B2"


def test_bundle_two_courses_is_10() -> None:
    quote = bundle_quote(["german-a1-advanced", "cloud"])
    assert quote["percent"] == 10
    assert quote["label"] == "2 or more courses"


def test_bundle_one_course_is_zero() -> None:
    quote = bundle_quote(["german-a1-zero-to-beginner"])
    assert quote["percent"] == 0


def test_apply_bundle_reduces_payable() -> None:
    payable, off, label = apply_bundle_cents(
        5_500_000,
        ["german-a1-zero-to-beginner", "german-a2-beginner", "german-b1-beginner", "german-b2-beginner"],
        "german-a1-zero-to-beginner",
    )
    assert label == "A1 to B2"
    assert off == round(5_500_000 * 0.15)
    assert payable == 5_500_000 - off


def test_hides_one_to_one_from_catalog() -> None:
    assert is_hidden_public_title("German 1:1 session", "mentor-session")
    assert not is_hidden_public_title("German A1: Zero to Beginner", "german-a1-zero-to-beginner")
