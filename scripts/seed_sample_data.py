from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.core.security import hash_password
from app.domain.enums import (
    AttendanceStatus,
    BookingStatus,
    ClassStatus,
    IntegrationProvider,
    IntegrationStatus,
    MemberRole,
    MembershipStatus,
    WaitlistStatus,
)
from app.domain.models import (
    Activity,
    Attendance,
    Booking,
    GymClass,
    IntegrationAccount,
    Instructor,
    Member,
    MembershipPlan,
    Waitlist,
)
from app.infrastructure.database.session import AsyncSessionLocal


@dataclass
class SeedStats:
    created: dict[str, int] = field(default_factory=dict)
    reused: dict[str, int] = field(default_factory=dict)

    def bump(self, bucket: dict[str, int], key: str) -> None:
        bucket[key] = bucket.get(key, 0) + 1

    def created_item(self, key: str) -> None:
        self.bump(self.created, key)

    def reused_item(self, key: str) -> None:
        self.bump(self.reused, key)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def get_or_create_membership_plan(
    *,
    name: str,
    description: str,
    price: Decimal,
    duration_days: int,
    stats: SeedStats,
) -> MembershipPlan:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(MembershipPlan).where(MembershipPlan.name == name))
        plan = result.scalar_one_or_none()
        if plan:
            stats.reused_item("membership_plans")
            return plan

        plan = MembershipPlan(
            name=name,
            description=description,
            price=price,
            duration_days=duration_days,
            is_active=True,
        )
        session.add(plan)
        await session.commit()
        await session.refresh(plan)
        stats.created_item("membership_plans")
        return plan


async def get_or_create_member(
    *,
    email: str,
    full_name: str,
    role: MemberRole,
    membership_status: MembershipStatus,
    membership_plan_id,
    phone: str,
    birth_date_value: date,
    emergency_contact: str,
    notes: str,
    profile_metadata: dict[str, object],
    stats: SeedStats,
) -> Member:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Member).where(Member.email == email))
        member = result.scalar_one_or_none()
        if member:
            stats.reused_item("members")
            return member

        member = Member(
            email=email,
            full_name=full_name,
            password_hash=hash_password("Password123!"),
            phone=phone,
            birth_date=birth_date_value,
            emergency_contact=emergency_contact,
            notes=notes,
            role=role,
            membership_status=membership_status,
            membership_plan_id=membership_plan_id,
            is_active=True,
            profile_metadata=profile_metadata,
        )
        session.add(member)
        await session.commit()
        await session.refresh(member)
        stats.created_item("members")
        return member


async def get_or_create_instructor(
    *,
    member_id,
    bio: str,
    specialties: str,
    stats: SeedStats,
) -> Instructor:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Instructor).where(Instructor.member_id == member_id))
        instructor = result.scalar_one_or_none()
        if instructor:
            stats.reused_item("instructors")
            return instructor

        instructor = Instructor(member_id=member_id, bio=bio, specialties=specialties)
        session.add(instructor)
        await session.commit()
        await session.refresh(instructor)
        stats.created_item("instructors")
        return instructor


async def get_or_create_class(
    *,
    name: str,
    description: str,
    instructor_id,
    scheduled_at: datetime,
    duration_minutes: int,
    capacity: int,
    location: str,
    status: ClassStatus,
    stats: SeedStats,
) -> GymClass:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(GymClass).where(GymClass.name == name))
        gym_class = result.scalar_one_or_none()
        if gym_class:
            stats.reused_item("classes")
            return gym_class

        gym_class = GymClass(
            name=name,
            description=description,
            instructor_id=instructor_id,
            scheduled_at=scheduled_at,
            duration_minutes=duration_minutes,
            capacity=capacity,
            location=location,
            status=status,
        )
        session.add(gym_class)
        await session.commit()
        await session.refresh(gym_class)
        stats.created_item("classes")
        return gym_class


async def get_or_create_booking(
    *,
    member_id,
    class_id,
    status: BookingStatus,
    booked_at: datetime,
    cancelled_at: datetime | None,
    stats: SeedStats,
) -> Booking:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Booking).where(Booking.member_id == member_id, Booking.class_id == class_id)
        )
        booking = result.scalar_one_or_none()
        if booking:
            stats.reused_item("bookings")
            return booking

        booking = Booking(
            member_id=member_id,
            class_id=class_id,
            status=status,
            booked_at=booked_at,
            cancelled_at=cancelled_at,
        )
        session.add(booking)
        await session.commit()
        await session.refresh(booking)
        stats.created_item("bookings")
        return booking


async def get_or_create_waitlist(
    *,
    member_id,
    class_id,
    position: int,
    status: WaitlistStatus,
    joined_at: datetime,
    promoted_at: datetime | None,
    cancelled_at: datetime | None,
    stats: SeedStats,
) -> Waitlist:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Waitlist).where(Waitlist.member_id == member_id, Waitlist.class_id == class_id)
        )
        waitlist = result.scalar_one_or_none()
        if waitlist:
            stats.reused_item("waitlists")
            return waitlist

        waitlist = Waitlist(
            member_id=member_id,
            class_id=class_id,
            position=position,
            status=status,
            joined_at=joined_at,
            promoted_at=promoted_at,
            cancelled_at=cancelled_at,
        )
        session.add(waitlist)
        await session.commit()
        await session.refresh(waitlist)
        stats.created_item("waitlists")
        return waitlist


async def get_or_create_attendance(
    *,
    member_id,
    class_id,
    marked_by_instructor_id,
    status: AttendanceStatus,
    notes: str,
    marked_at: datetime,
    stats: SeedStats,
) -> Attendance:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Attendance).where(Attendance.member_id == member_id, Attendance.class_id == class_id)
        )
        attendance = result.scalar_one_or_none()
        if attendance:
            stats.reused_item("attendance")
            return attendance

        attendance = Attendance(
            member_id=member_id,
            class_id=class_id,
            marked_by_instructor_id=marked_by_instructor_id,
            status=status,
            notes=notes,
            mark_source="seed",
            marked_at=marked_at,
        )
        session.add(attendance)
        await session.commit()
        await session.refresh(attendance)
        stats.created_item("attendance")
        return attendance


async def get_or_create_integration_account(
    *,
    member_id,
    external_account_id: str,
    access_token: str,
    refresh_token: str,
    token_expires_at: datetime,
    provider_metadata: dict[str, object],
    stats: SeedStats,
) -> IntegrationAccount:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(IntegrationAccount).where(
                IntegrationAccount.member_id == member_id,
                IntegrationAccount.provider == IntegrationProvider.STRAVA,
            )
        )
        account = result.scalar_one_or_none()
        if account:
            stats.reused_item("integration_accounts")
            return account

        account = IntegrationAccount(
            member_id=member_id,
            provider=IntegrationProvider.STRAVA,
            external_account_id=external_account_id,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=token_expires_at,
            status=IntegrationStatus.CONNECTED,
            provider_metadata=provider_metadata,
            last_synced_at=utc_now() - timedelta(hours=1),
        )
        session.add(account)
        await session.commit()
        await session.refresh(account)
        stats.created_item("integration_accounts")
        return account


async def get_or_create_activity(
    *,
    member_id,
    integration_account_id,
    external_id: str,
    name: str,
    activity_type: str,
    distance_meters: float,
    moving_time_seconds: int,
    started_at: datetime,
    payload: dict[str, object],
    stats: SeedStats,
) -> Activity:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Activity).where(
                Activity.provider == IntegrationProvider.STRAVA,
                Activity.external_id == external_id,
            )
        )
        activity = result.scalar_one_or_none()
        if activity:
            stats.reused_item("activities")
            return activity

        activity = Activity(
            member_id=member_id,
            integration_account_id=integration_account_id,
            provider=IntegrationProvider.STRAVA,
            external_id=external_id,
            name=name,
            activity_type=activity_type,
            distance_meters=distance_meters,
            moving_time_seconds=moving_time_seconds,
            started_at=started_at,
            payload=payload,
        )
        session.add(activity)
        await session.commit()
        await session.refresh(activity)
        stats.created_item("activities")
        return activity


async def seed() -> SeedStats:
    stats = SeedStats()
    now = utc_now()

    starter_plan = await get_or_create_membership_plan(
        name="Starter Monthly",
        description="Entry level membership with access to standard classes and open gym.",
        price=Decimal("39.99"),
        duration_days=30,
        stats=stats,
    )
    performance_plan = await get_or_create_membership_plan(
        name="Performance Plus",
        description="Premium membership with coaching, advanced classes, and recovery perks.",
        price=Decimal("79.99"),
        duration_days=30,
        stats=stats,
    )

    admin = await get_or_create_member(
        email="admin.seed@example.com",
        full_name="Ariana Admin",
        role=MemberRole.ADMIN,
        membership_status=MembershipStatus.ACTIVE,
        membership_plan_id=performance_plan.id,
        phone="+1-202-555-0101",
        birth_date_value=date(1989, 4, 3),
        emergency_contact="Jordan Admin",
        notes="Seeded administrator account.",
        profile_metadata={"seeded": True, "focus": "operations"},
        stats=stats,
    )
    instructor_one_member = await get_or_create_member(
        email="lucia.coach@example.com",
        full_name="Lucia Romero",
        role=MemberRole.INSTRUCTOR,
        membership_status=MembershipStatus.ACTIVE,
        membership_plan_id=performance_plan.id,
        phone="+1-202-555-0102",
        birth_date_value=date(1992, 8, 14),
        emergency_contact="Mateo Romero",
        notes="Seeded instructor focused on conditioning.",
        profile_metadata={"seeded": True, "specialty": "conditioning"},
        stats=stats,
    )
    instructor_two_member = await get_or_create_member(
        email="marco.strength@example.com",
        full_name="Marco Diaz",
        role=MemberRole.INSTRUCTOR,
        membership_status=MembershipStatus.ACTIVE,
        membership_plan_id=performance_plan.id,
        phone="+1-202-555-0103",
        birth_date_value=date(1987, 11, 21),
        emergency_contact="Elena Diaz",
        notes="Seeded instructor focused on strength.",
        profile_metadata={"seeded": True, "specialty": "strength"},
        stats=stats,
    )
    member_one = await get_or_create_member(
        email="sofia.member@example.com",
        full_name="Sofia Herrera",
        role=MemberRole.MEMBER,
        membership_status=MembershipStatus.ACTIVE,
        membership_plan_id=starter_plan.id,
        phone="+1-202-555-0104",
        birth_date_value=date(1996, 1, 9),
        emergency_contact="Luis Herrera",
        notes="Seeded member with active bookings.",
        profile_metadata={"seeded": True, "goal": "endurance"},
        stats=stats,
    )
    member_two = await get_or_create_member(
        email="diego.member@example.com",
        full_name="Diego Castillo",
        role=MemberRole.MEMBER,
        membership_status=MembershipStatus.SUSPENDED,
        membership_plan_id=starter_plan.id,
        phone="+1-202-555-0105",
        birth_date_value=date(1994, 6, 18),
        emergency_contact="Mia Castillo",
        notes="Seeded member with waitlist and attendance examples.",
        profile_metadata={"seeded": True, "goal": "mobility"},
        stats=stats,
    )

    instructor_one = await get_or_create_instructor(
        member_id=instructor_one_member.id,
        bio="Former track athlete now coaching hybrid conditioning and interval work.",
        specialties="HIIT, endurance, mobility",
        stats=stats,
    )
    instructor_two = await get_or_create_instructor(
        member_id=instructor_two_member.id,
        bio="Strength coach focused on safe progression and barbell technique.",
        specialties="strength, olympic lifting, fundamentals",
        stats=stats,
    )

    class_one = await get_or_create_class(
        name="Sunrise Conditioning",
        description="Fast-paced interval session to start the week with cardio and core work.",
        instructor_id=instructor_one.id,
        scheduled_at=now + timedelta(days=1, hours=8),
        duration_minutes=50,
        capacity=16,
        location="Studio A",
        status=ClassStatus.SCHEDULED,
        stats=stats,
    )
    class_two = await get_or_create_class(
        name="Barbell Fundamentals",
        description="Technique-first strength session covering squat, press, and deadlift patterns.",
        instructor_id=instructor_two.id,
        scheduled_at=now + timedelta(days=2, hours=18),
        duration_minutes=75,
        capacity=12,
        location="Strength Floor",
        status=ClassStatus.SCHEDULED,
        stats=stats,
    )
    class_three = await get_or_create_class(
        name="Recovery Flow",
        description="Low-impact guided recovery with mobility, breath work, and light movement.",
        instructor_id=instructor_one.id,
        scheduled_at=now - timedelta(days=2, hours=3),
        duration_minutes=45,
        capacity=20,
        location="Mind Body Room",
        status=ClassStatus.COMPLETED,
        stats=stats,
    )

    await get_or_create_booking(
        member_id=member_one.id,
        class_id=class_one.id,
        status=BookingStatus.CONFIRMED,
        booked_at=now - timedelta(hours=5),
        cancelled_at=None,
        stats=stats,
    )
    await get_or_create_booking(
        member_id=member_two.id,
        class_id=class_two.id,
        status=BookingStatus.CANCELLED,
        booked_at=now - timedelta(days=1, hours=2),
        cancelled_at=now - timedelta(hours=6),
        stats=stats,
    )

    await get_or_create_waitlist(
        member_id=member_two.id,
        class_id=class_one.id,
        position=1,
        status=WaitlistStatus.WAITING,
        joined_at=now - timedelta(hours=4),
        promoted_at=None,
        cancelled_at=None,
        stats=stats,
    )
    await get_or_create_waitlist(
        member_id=admin.id,
        class_id=class_two.id,
        position=2,
        status=WaitlistStatus.PROMOTED,
        joined_at=now - timedelta(days=1),
        promoted_at=now - timedelta(hours=12),
        cancelled_at=None,
        stats=stats,
    )

    await get_or_create_attendance(
        member_id=member_one.id,
        class_id=class_three.id,
        marked_by_instructor_id=instructor_one.id,
        status=AttendanceStatus.PRESENT,
        notes="Completed the full recovery circuit.",
        marked_at=now - timedelta(days=2, hours=1),
        stats=stats,
    )
    await get_or_create_attendance(
        member_id=member_two.id,
        class_id=class_three.id,
        marked_by_instructor_id=instructor_one.id,
        status=AttendanceStatus.LATE,
        notes="Joined during the second mobility block.",
        marked_at=now - timedelta(days=2, hours=1),
        stats=stats,
    )

    integration_one = await get_or_create_integration_account(
        member_id=member_one.id,
        external_account_id="strava-sofia-001",
        access_token="seed-access-token-sofia",
        refresh_token="seed-refresh-token-sofia",
        token_expires_at=now + timedelta(days=20),
        provider_metadata={"athlete_name": "Sofia Herrera", "connected_from": "seed"},
        stats=stats,
    )
    integration_two = await get_or_create_integration_account(
        member_id=member_two.id,
        external_account_id="strava-diego-001",
        access_token="seed-access-token-diego",
        refresh_token="seed-refresh-token-diego",
        token_expires_at=now + timedelta(days=10),
        provider_metadata={"athlete_name": "Diego Castillo", "connected_from": "seed"},
        stats=stats,
    )

    await get_or_create_activity(
        member_id=member_one.id,
        integration_account_id=integration_one.id,
        external_id="seed-activity-sofia-5k",
        name="Morning 5K Tempo",
        activity_type="run",
        distance_meters=5000,
        moving_time_seconds=1560,
        started_at=now - timedelta(days=3),
        payload={"source": "seed", "avg_pace": "5:12/km"},
        stats=stats,
    )
    await get_or_create_activity(
        member_id=member_two.id,
        integration_account_id=integration_two.id,
        external_id="seed-activity-diego-ride",
        name="Saturday Endurance Ride",
        activity_type="ride",
        distance_meters=22800,
        moving_time_seconds=4020,
        started_at=now - timedelta(days=4),
        payload={"source": "seed", "avg_speed_kph": 20.4},
        stats=stats,
    )

    return stats


def print_summary(stats: SeedStats) -> None:
    ordered_tables = [
        "membership_plans",
        "members",
        "instructors",
        "classes",
        "bookings",
        "waitlists",
        "attendance",
        "integration_accounts",
        "activities",
    ]

    print("Sample data seed complete.")
    for table in ordered_tables:
        created = stats.created.get(table, 0)
        reused = stats.reused.get(table, 0)
        print(f"- {table}: created={created}, reused={reused}")

    print("\nSeeded login examples:")
    print("- admin.seed@example.com / Password123!")
    print("- lucia.coach@example.com / Password123!")
    print("- marco.strength@example.com / Password123!")
    print("- sofia.member@example.com / Password123!")
    print("- diego.member@example.com / Password123!")


async def main() -> None:
    stats = await seed()
    print_summary(stats)


if __name__ == "__main__":
    asyncio.run(main())
