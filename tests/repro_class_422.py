
import requests
import uuid
import datetime

BASE_URL = "http://localhost:8000" # Assume local dev server

def test_create_class_multi_date():
    payload = {
        "name": "CrossFit Multi",
        "location": "Main Box",
        "instructor_id": str(uuid.uuid4()), # Just a random UUID for validation test
        "duration_minutes": 60,
        "capacity": 12,
        "scheduled_at": "2026-06-01T18:00:00",
        "dates": ["2026-06-01T18:00:00", "2026-06-03T18:00:00"],
        "description": "Multi date test",
        "status": "scheduled"
    }
    
    # We don't need real auth to see 422 (validation happens first)
    response = requests.post(f"{BASE_URL}/classes", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    # This is just for local thinking, won't run against production
    # But I can use it to check my understanding of the schema
    pass
