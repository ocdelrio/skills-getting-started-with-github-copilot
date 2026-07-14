import pytest

from concurrent.futures import ThreadPoolExecutor


pytestmark = pytest.mark.stress


def test_concurrent_unique_signups_are_all_persisted(client):
    emails = [f"student{i}@mergington.edu" for i in range(20)]

    def signup(email):
        return client.post(f"/activities/Chess Club/signup?email={email}")

    with ThreadPoolExecutor(max_workers=10) as executor:
        responses = list(executor.map(signup, emails))

    assert all(response.status_code == 200 for response in responses)

    activities_response = client.get("/activities")
    participants = activities_response.json()["Chess Club"]["participants"]

    for email in emails:
        assert email in participants


def test_concurrent_duplicate_signups_only_register_once(client):
    email = "stress.duplicate@mergington.edu"

    def signup():
        return client.post(f"/activities/Chess Club/signup?email={email}")

    with ThreadPoolExecutor(max_workers=12) as executor:
        responses = list(executor.map(lambda _: signup(), range(12)))

    success_count = sum(1 for response in responses if response.status_code == 200)
    conflict_count = sum(1 for response in responses if response.status_code == 409)

    assert success_count == 1
    assert conflict_count == 11

    activities_response = client.get("/activities")
    participants = activities_response.json()["Chess Club"]["participants"]
    assert participants.count(email) == 1
