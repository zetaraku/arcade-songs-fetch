#!/usr/bin/bash
# Install AWS CLI version 2 first (https://aws.amazon.com/cli/)

if [ -z "$GAME_CODE" ]; then
  echo "GAME_CODE is not set, aborted."
  exit 1
fi

if [ -z "$S3_BUCKET_NAME" ]; then
  echo "S3_BUCKET_NAME is not set, skipping upload."
  exit 2
fi

if ! command -v aws >/dev/null 2>&1; then
  echo "AWS CLI v2 is not installed. Please install it first: https://aws.amazon.com/cli/"
  exit 3
fi

# Upload data
aws s3 cp "dist/$GAME_CODE/" "s3://$S3_BUCKET_NAME/$GAME_CODE/" --recursive --acl 'public-read'

# Upload images
aws s3 sync "data/$GAME_CODE/img/" "s3://$S3_BUCKET_NAME/$GAME_CODE/img/" --acl 'public-read'

# Invalidate CloudFront cache for data (if any)
if [ -n "$CLOUDFRONT_DIST_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DIST_ID" --paths "/$GAME_CODE/*"
fi
