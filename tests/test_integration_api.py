import pytest


pytestmark = pytest.mark.integration


def test_get_activities_returns_full_catalog(client):
    response = client.get("/activities")

    assert response.status_code == 200
    payload = response.json()
    assert "Chess Club" in payload
    assert "Gym Class" in payload
    assert payload["Chess Club"]["participants"] == ["michael@mergington.edu", "daniel@mergington.edu"]


def test_signup_endpoint_adds_participant_and_normalizes_email(client):
    response = client.post("/activities/Chess Club/signup?email=  New.Student@MerGington.edu  ")

    assert response.status_code == 200
    assert response.json() == {"message": "Signed up new.student@mergington.edu for Chess Club"}

    activities_response = client.get("/activities")
    participants = activities_response.json()["Chess Club"]["participants"]
    assert "new.student@mergington.edu" in participants


def test_signup_endpoint_rejects_duplicates_with_conflict(client):
    response = client.post("/activities/Chess Club/signup?email=michael@mergington.edu")

    assert response.status_code == 409
    assert response.json()["detail"] == "This student is already signed up for this activity"


def test_signup_endpoint_returns_404_for_unknown_activity(client):
    response = client.post("/activities/Unknown/signup?email=test@mergington.edu")

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_remove_endpoint_deletes_participant_and_updates_memory(client):
    signup_response = client.post("/activities/Chess Club/signup?email=remove.me@mergington.edu")
    assert signup_response.status_code == 200

    delete_response = client.delete("/activities/Chess Club/participants?email=REMOVE.ME@mergington.edu")

    assert delete_response.status_code == 200
    assert delete_response.json() == {"message": "Removed remove.me@mergington.edu from Chess Club"}

    activities_response = client.get("/activities")
    participants = activities_response.json()["Chess Club"]["participants"]
    assert "remove.me@mergington.edu" not in participants


def test_remove_endpoint_returns_404_when_participant_missing(client):
    response = client.delete("/activities/Chess Club/participants?email=missing@mergington.edu")

    assert response.status_code == 404
    assert response.json()["detail"] == "This student is not signed up for this activity"
