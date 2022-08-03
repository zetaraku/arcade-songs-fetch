#!/usr/bin/bash
# Install AWS CLI version 2 first (https://aws.amazon.com/cli/)

# Disable AWS output paging
export AWS_PAGER=''

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

echo "* Syncing files from dist/$GAME_CODE/ to s3://$S3_BUCKET_NAME/$GAME_CODE/ ..."
aws s3 sync "dist/$GAME_CODE/" "s3://$S3_BUCKET_NAME/$GAME_CODE/" --acl 'public-read'

if [ -n "$CLOUDFRONT_DIST_ID" ]; then
  echo "* Invalidating CloudFront cache ..."
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DIST_ID" --paths "/$GAME_CODE/*" >/dev/null
fi
