#!/bin/sh
set -e

celery -A app.workers.celery_app.celery_app beat --loglevel=info

