#!/usr/bin/bash
# Install AWS CLI version 2 first (https://aws.amazon.com/cli/)

# Upload data and images
aws s3 cp "dist/$GAME_CODE/data.json" "s3://$S3_BUCKET_NAME/$GAME_CODE/data.json" --acl 'public-read'
aws s3 sync "data/$GAME_CODE/images/" "s3://$S3_BUCKET_NAME/$GAME_CODE/images/" --acl 'public-read' --cache-control 'public, max-age=31536000, immutable'

# Invalidate CloudFront cache for data (if any)
if [ -n "$CLOUDFRONT_DIST_ID" ]; then
  aws cloudfront create-invalidation --distribution-id "$CLOUDFRONT_DIST_ID" --paths "/$GAME_CODE/*.json"
fi
