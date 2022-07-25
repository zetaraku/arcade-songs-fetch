#!/usr/bin/bash
# Install AWS CLI version 2 first (https://aws.amazon.com/cli/)

# Disable AWS output paging
AWS_PAGER=''

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

echo "* Uploading data ..."
aws s3 cp --recursive "dist/$GAME_CODE/" "s3://$S3_BUCKET_NAME/$GAME_CODE/" --acl 'public-read'
aws s3 cp "data/$GAME_CODE/gallery.yaml" "s3://$S3_BUCKET_NAME/$GAME_CODE/gallery.yaml" --acl 'public-read'

echo "* Uploading images ..."
aws s3 sync "data/$GAME_CODE/img/" "s3://$S3_BUCKET_NAME/$GAME_CODE/img/" --acl 'public-read'

if [ -n "$CLOUDFRONT_DIST_ID" ]; then
  echo "* Invalidating CloudFront cache ..."
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DIST_ID" --paths "/$GAME_CODE/*" >/dev/null
fi
