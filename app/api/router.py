from fastapi import APIRouter

from app.api.routes import attendance, auth, billing, bookings, classes, integrations, members, plans

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(billing.router)
api_router.include_router(members.router)
api_router.include_router(classes.router)
api_router.include_router(bookings.router)
api_router.include_router(attendance.router)
api_router.include_router(integrations.router)
api_router.include_router(plans.router)
