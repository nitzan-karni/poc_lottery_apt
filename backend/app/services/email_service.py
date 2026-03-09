"""
Email service using Resend API with database logging.
"""
import logging
import resend
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.email_log import EmailLog, EmailType
import uuid

logger = logging.getLogger(__name__)

resend.api_key = settings.RESEND_API_KEY


async def send_email(
    db: Session,
    to: str,
    subject: str,
    html: str,
    email_type: EmailType,
    candidate_id: str | None = None,
) -> dict:
    status = "sent"
    try:
        params: resend.Emails.SendParams = {
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        result = resend.Emails.send(params)
    except Exception as e:
        logger.error(f"Email send failed to {to}: {e}")
        status = "failed"
        result = {"error": str(e)}

    log = EmailLog(
        id=str(uuid.uuid4()),
        candidate_id=candidate_id,
        to=to,
        subject=subject,
        body=html,
        type=email_type,
        status=status,
    )
    db.add(log)
    db.commit()
    return result


def build_correction_email(candidate_name: str, correction_text: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00838F;">Affordable Housing Lottery — Document Correction Required</h2>
      <p>Dear {candidate_name},</p>
      <p>After reviewing your application, our team has identified issues that require correction:</p>
      <div style="background: #FFF8E1; border-left: 4px solid #F57F17; padding: 16px; margin: 16px 0;">
        <p style="margin: 0;">{correction_text}</p>
      </div>
      <p>Please resubmit the corrected documents as soon as possible.</p>
      <p>If you have questions, please contact us at <a href="mailto:tlv4less@e-b.co.il">tlv4less@e-b.co.il</a>.</p>
      <p style="color: #546E7A; font-size: 12px; margin-top: 24px;">
        Ezra VaBitaron — Tel Aviv-Yafo Municipality Affordable Housing Division
      </p>
    </div>
    """


def build_approval_email(candidate_name: str, project_name: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2E7D32;">Registration Approved ✓</h2>
      <p>Dear {candidate_name},</p>
      <p>Your registration for <strong>{project_name}</strong> has been approved. You will be included in the upcoming lottery draw.</p>
      <p>You will be notified by email as soon as the lottery results are available.</p>
      <p style="color: #546E7A; font-size: 12px; margin-top: 24px;">Ezra VaBitaron — Tel Aviv-Yafo Municipality</p>
    </div>
    """


def build_rejection_email(candidate_name: str, project_name: str) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #C62828;">Registration Not Approved</h2>
      <p>Dear {candidate_name},</p>
      <p>We regret to inform you that your registration for <strong>{project_name}</strong> was not approved.</p>
      <p><strong>Appeal process:</strong> You may submit a written, reasoned appeal within <strong>3 calendar days</strong> to
        <a href="mailto:tlv4less@e-b.co.il">tlv4less@e-b.co.il</a>. The appeals committee's decision is final.
      </p>
      <p style="color: #546E7A; font-size: 12px; margin-top: 24px;">Ezra VaBitaron — Tel Aviv-Yafo Municipality</p>
    </div>
    """


def build_winner_email(candidate_name: str, project_name: str, lottery_number: int) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00838F;">🎉 Congratulations! You've Been Selected!</h2>
      <p>Dear {candidate_name},</p>
      <p>You have been selected in the affordable housing lottery for <strong>{project_name}</strong>.</p>
      <p>Your lottery number is <strong style="font-size: 24px; color: #EF6C00;">#{lottery_number}</strong>.</p>
      <p>You will receive a separate invitation to schedule an apartment viewing tour. Please ensure you remain reachable at your registered email and phone number.</p>
      <p style="color: #546E7A; font-size: 12px; margin-top: 24px;">Ezra VaBitaron — Tel Aviv-Yafo Municipality</p>
    </div>
    """


def build_waitlist_email(candidate_name: str, project_name: str, lottery_number: int) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1565C0;">Lottery Result — Waiting List</h2>
      <p>Dear {candidate_name},</p>
      <p>You have been placed on the <strong>waiting list</strong> at position <strong style="color: #EF6C00;">#{lottery_number}</strong> for <strong>{project_name}</strong>.</p>
      <p>If a spot becomes available, you will be contacted promptly. Please maintain your eligibility throughout the waiting period — you must remain apartment-free.</p>
      <p style="color: #546E7A; font-size: 12px; margin-top: 24px;">Ezra VaBitaron — Tel Aviv-Yafo Municipality</p>
    </div>
    """


def build_tour_invitation_email(candidate_name: str, project_name: str, lottery_number: int) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00838F;">Apartment Tour Invitation</h2>
      <p>Dear {candidate_name},</p>
      <p>As a winner (#{lottery_number}) in the <strong>{project_name}</strong> lottery, you are invited to schedule a tour and select your apartment.</p>
      <p>Please respond to this email or contact us at <a href="mailto:tlv4less@e-b.co.il">tlv4less@e-b.co.il</a> to book your appointment <strong>within 14 days</strong>.</p>
      <p><em>Failure to respond within 14 days may result in reassignment to the next waitlisted candidate.</em></p>
      <p style="color: #546E7A; font-size: 12px; margin-top: 24px;">Ezra VaBitaron — Tel Aviv-Yafo Municipality</p>
    </div>
    """


def build_waitlist_promotion_email(candidate_name: str, project_name: str, lottery_number: int) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #00838F;">A Spot Has Opened — You Are Now a Winner!</h2>
      <p>Dear {candidate_name},</p>
      <p>Great news! A spot has opened in the <strong>{project_name}</strong> lottery. You have been promoted from the waiting list to <strong>winner status</strong> (original position: #{lottery_number}).</p>
      <p>You will receive a separate apartment tour invitation shortly. Please ensure you remain reachable.</p>
      <p style="color: #546E7A; font-size: 12px; margin-top: 24px;">Ezra VaBitaron — Tel Aviv-Yafo Municipality</p>
    </div>
    """
