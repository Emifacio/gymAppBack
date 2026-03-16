from celery import Celery
from celery.schedules import crontab

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "gym_backend",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.workers.tasks.activity_sync",
        "app.workers.tasks.notifications",
        "app.workers.tasks.reminders",
        "app.workers.tasks.subscriptions",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone=settings.timezone,
    broker_connection_retry_on_startup=True,
    beat_schedule={
        "send-class-reminders": {
            "task": "app.tasks.send_class_reminders",
            "schedule": crontab(minute="*/30"),
        },
        "reset-subscription-credits": {
            "task": "app.tasks.reset_subscription_credits",
            "schedule": crontab(minute=0),
        },
    },
)
