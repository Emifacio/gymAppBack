import asyncio
import logging
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import get_settings
from app.domain.enums import ClassStatus
from app.domain.models.gym_class import GymClass
from app.repositories.class_repository import ClassRepository
from app.repositories.instructor_repository import InstructorRepository
from app.repositories.booking_repository import BookingRepository
from app.repositories.waitlist_repository import WaitlistRepository
from app.services.class_service import ClassService
from app.schemas.class_schema import ClassCreate

async def repro():
    settings = get_settings()
    engine = create_async_engine(settings.database_url)
    AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
    
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    async with AsyncSessionLocal() as session:
        class_repo = ClassRepository(session)
        instructor_repo = InstructorRepository(session)
        booking_repo = BookingRepository(session)
        waitlist_repo = WaitlistRepository(session)
        
        # Mocking RedisCache for simplicity
        class MockCache:
            async def get_json(self, key): return None
            async def set_json(self, key, val): pass
            async def delete(self, key): pass
        
        service = ClassService(
            session=session,
            class_repository=class_repo,
            instructor_repository=instructor_repo,
            booking_repository=booking_repo,
            waitlist_repository=waitlist_repo,
            cache=MockCache()
        )
        
        payload = ClassCreate(
            name="Entrenamiento Funcional",
            description="Entrenamiento Funcional",
            instructor_id=None, # Admin or system creation
            scheduled_at=datetime.now(timezone.utc) + timedelta(days=7),
            duration_minutes=60,
            capacity=10,
            location="CARP"
        )
        
        logger.info("Creating class...")
        created_class = await service.create_class(payload)
        logger.info(f"Class created with ID: {created_class.id}")
        
        # Verify it exists in a new session (to ensure persistence)
        await session.close()
        
    async with AsyncSessionLocal() as session2:
        class_repo2 = ClassRepository(session2)
        found = await class_repo2.get_by_id(created_class.id)
        if found:
            logger.info("SUCCESS: Class found in database after commit.")
        else:
            logger.error("FAILURE: Class NOT found in database after commit.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(repro())
