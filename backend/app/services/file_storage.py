"""
S3-compatible file storage service (AWS S3, Cloudflare R2, MinIO).
"""
import boto3
import uuid
import logging
from botocore.exceptions import ClientError
from app.core.config import settings

logger = logging.getLogger(__name__)

_s3_client = None


def get_s3_client():
    global _s3_client
    if _s3_client is None:
        kwargs = {
            "region_name": settings.S3_REGION,
            "aws_access_key_id": settings.S3_ACCESS_KEY,
            "aws_secret_access_key": settings.S3_SECRET_KEY,
        }
        if settings.S3_ENDPOINT:
            kwargs["endpoint_url"] = settings.S3_ENDPOINT
        _s3_client = boto3.client("s3", **kwargs)
    return _s3_client


async def upload_file(
    file_bytes: bytes,
    original_filename: str,
    mime_type: str,
    candidate_id: str,
    document_type: str,
) -> tuple[str, int]:
    """
    Upload file to S3. Returns (storage_key, file_size).
    """
    ext = original_filename.rsplit(".", 1)[-1] if "." in original_filename else "bin"
    storage_key = f"candidates/{candidate_id}/{document_type}/{uuid.uuid4()}.{ext}"
    file_size = len(file_bytes)

    s3 = get_s3_client()
    s3.put_object(
        Bucket=settings.S3_BUCKET,
        Key=storage_key,
        Body=file_bytes,
        ContentType=mime_type,
    )

    return storage_key, file_size


async def get_presigned_url(storage_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned URL for temporary access to a document."""
    s3 = get_s3_client()
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": storage_key},
        ExpiresIn=expires_in,
    )
    return url


async def get_file_bytes(storage_key: str) -> bytes:
    """Download file bytes from S3."""
    s3 = get_s3_client()
    response = s3.get_object(Bucket=settings.S3_BUCKET, Key=storage_key)
    return response["Body"].read()


async def delete_file(storage_key: str) -> None:
    """Delete a file from S3."""
    s3 = get_s3_client()
    s3.delete_object(Bucket=settings.S3_BUCKET, Key=storage_key)
