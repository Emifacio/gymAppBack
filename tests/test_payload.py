import asyncio
from datetime import datetime, timezone
from uuid import UUID, uuid4
from pydantic import ValidationError
from app.schemas.class_schema import ClassCreate
from app.services.class_service import ClassService
from unittest.mock import AsyncMock, MagicMock

def test_pydantic_validation():
    print("Testing Pydantic validation for ClassCreate...")
    data = {
        "name": "Entrenamiento Funcional",
        "description": "Entrenamiento Funcional",
        "instructor_id": "", # The empty string from the user's snippet
        "scheduled_at": "2026-03-23T20:33:00Z",
        "duration_minutes": 60,
        "capacity": 10,
        "location": "CARP"
    }
    try:
        ClassCreate(**data)
        print("SUCCESS: Pydantic accepted empty string (unexpected if strict).")
    except ValidationError as e:
        print(f"EXPECTED FAILURE: Pydantic rejected empty string: {e}")

async def test_service_flow():
    print("\nTesting ClassService.create_class flow with mocks...")
    session = AsyncMock()
    session.in_transaction.return_value = False
    
    # Mock transaction context manager
    tx = AsyncMock()
    session.begin.return_value = tx
    tx.__aenter__.return_value = session
    
    class_repo = MagicMock()
    class_repo.add = AsyncMock()
    
    service = ClassService(
        session=session,
        class_repository=class_repo,
        instructor_repository=AsyncMock(),
        booking_repository=AsyncMock(),
        waitlist_repository=AsyncMock(),
        cache=AsyncMock()
    )
    
    payload = ClassCreate(
        name="Test Class",
        scheduled_at=datetime.now(timezone.utc),
        capacity=10,
        location="Gym"
    )
    
    try:
        await service.create_class(payload)
        print("SUCCESS: Service flow completed.")
        session.begin.assert_called_once()
        class_repo.add.assert_called_once()
    except Exception as e:
        print(f"FAILURE: Service flow failed: {e}")

if __name__ == "__main__":
    test_pydantic_validation()
    asyncio.run(test_service_flow())
