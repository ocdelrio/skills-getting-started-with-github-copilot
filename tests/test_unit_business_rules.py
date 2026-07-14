import pytest
from fastapi import HTTPException

from src import app as app_module


pytestmark = pytest.mark.unit


def test_normalize_email_strips_and_lowercases():
    assert app_module.normalize_email("  Student@MerGington.edu  ") == "student@mergington.edu"


def test_sign_up_participant_normalizes_and_adds_email():
    result = app_module.sign_up_participant("Chess Club", "  NEW@Mergington.edu  ")

    assert result == {"message": "Signed up new@mergington.edu for Chess Club"}
    assert "new@mergington.edu" in app_module.activities["Chess Club"]["participants"]


def test_sign_up_participant_rejects_duplicate_email():
    with pytest.raises(HTTPException) as exc_info:
        app_module.sign_up_participant("Chess Club", "michael@mergington.edu")

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == "This student is already signed up for this activity"


def test_remove_participant_removes_normalized_email():
    app_module.activities["Chess Club"]["participants"].append("temp@mergington.edu")

    result = app_module.remove_participant_from_activity("Chess Club", " TEMP@mergington.edu ")

    assert result == {"message": "Removed temp@mergington.edu from Chess Club"}
    assert "temp@mergington.edu" not in app_module.activities["Chess Club"]["participants"]


def test_remove_participant_rejects_missing_email():
    with pytest.raises(HTTPException) as exc_info:
        app_module.remove_participant_from_activity("Chess Club", "missing@mergington.edu")

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "This student is not signed up for this activity"
