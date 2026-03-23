import asyncio
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    @property
    def is_configured(self) -> bool:
        return bool(self.settings.smtp_host and self.settings.email_from)

    async def send_email(
        self,
        *,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: str | None = None,
    ) -> bool:
        if not self.is_configured:
            logger.warning(
                "email_delivery_skipped reason=missing_configuration to_email=%s subject=%s",
                to_email,
                subject,
            )
            return False

        await asyncio.to_thread(
            self._send_email_sync,
            to_email=to_email,
            subject=subject,
            text_body=text_body,
            html_body=html_body,
        )
        logger.info("email_delivery_sent to_email=%s subject=%s", to_email, subject)
        return True

    def _send_email_sync(
        self,
        *,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: str | None = None,
    ) -> None:
        message = EmailMessage()
        message["From"] = self.settings.email_from
        message["To"] = to_email
        message["Subject"] = subject
        if self.settings.email_reply_to:
            message["Reply-To"] = self.settings.email_reply_to
        message.set_content(text_body)
        if html_body:
            message.add_alternative(html_body, subtype="html")

        if self.settings.smtp_use_ssl:
            smtp_client = smtplib.SMTP_SSL(
                self.settings.smtp_host,
                self.settings.smtp_port,
                timeout=self.settings.smtp_timeout_seconds,
            )
        else:
            smtp_client = smtplib.SMTP(
                self.settings.smtp_host,
                self.settings.smtp_port,
                timeout=self.settings.smtp_timeout_seconds,
            )

        with smtp_client as client:
            if self.settings.smtp_use_tls and not self.settings.smtp_use_ssl:
                client.starttls()
            if self.settings.smtp_username:
                client.login(self.settings.smtp_username, self.settings.smtp_password or "")
            client.send_message(message)
