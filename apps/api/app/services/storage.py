"""S3-compatible object storage service for artifacts."""

import os
from typing import Optional

try:
    import boto3
    from botocore.client import Config
    from botocore.exceptions import ClientError
except ImportError:  # pragma: no cover
    boto3 = None
    Config = None  # type: ignore
    ClientError = None  # type: ignore


def _get_s3_client():
    if boto3 is None:
        raise RuntimeError("boto3 is not installed; install it to use artifact storage.")
    endpoint = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
    access_key = os.getenv("S3_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("S3_SECRET_KEY", "minioadmin")
    region = os.getenv("S3_REGION", "us-east-1")

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name=region,
        config=Config(signature_version="s3v4"),
    )


def _get_bucket() -> str:
    return os.getenv("S3_BUCKET", "agentpatch-artifacts")


def ensure_bucket():
    """Create the configured bucket if it does not exist."""
    client = _get_s3_client()
    bucket = _get_bucket()
    try:
        client.head_bucket(Bucket=bucket)
    except Exception as exc:
        if ClientError is not None and isinstance(exc, ClientError):
            error_code = exc.response["Error"]["Code"]
            if error_code == "404":
                client.create_bucket(Bucket=bucket)
                return bucket
        raise
    return bucket


def upload_bytes(
    key: str,
    data: bytes,
    content_type: Optional[str] = None,
) -> str:
    """Upload bytes to S3/MinIO and return the storage URL."""
    client = _get_s3_client()
    bucket = ensure_bucket()
    client.put_object(
        Bucket=bucket,
        Key=key,
        Body=data,
        ContentType=content_type or "application/octet-stream",
    )
    return f"s3://{bucket}/{key}"


def get_signed_url(key: str, expiration: int = 3600) -> str:
    """Generate a signed URL for an object."""
    client = _get_s3_client()
    bucket = _get_bucket()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expiration,
    )
