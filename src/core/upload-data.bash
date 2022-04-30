#!/usr/bin/bash
# Install AWS CLI version 2 first (https://aws.amazon.com/cli/)

if [ -z "$S3_BUCKET_NAME" ]; then
  echo "S3_BUCKET_NAME is not set, skipping upload."
  exit 1
fi

# Upload data and images
aws s3 cp "dist/$GAME_CODE/data.json" "s3://$S3_BUCKET_NAME/$GAME_CODE/data.json" --acl 'public-read'
aws s3 sync "data/$GAME_CODE/img/" "s3://$S3_BUCKET_NAME/$GAME_CODE/img/" --acl 'public-read'

# Upload gallery (if any)
if [ -f "dist/$GAME_CODE/gallery.json" ]; then
  aws s3 cp "dist/$GAME_CODE/gallery.json" "s3://$S3_BUCKET_NAME/$GAME_CODE/gallery.json" --acl 'public-read'
fi

# Invalidate CloudFront cache for data (if any)
if [ -n "$CLOUDFRONT_DIST_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DIST_ID" --paths "/$GAME_CODE/*"
fi
