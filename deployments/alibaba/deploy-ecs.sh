#!/usr/bin/env bash
set -euo pipefail

: "${ALIBABA_REGION_ID:?required}"
: "${ALIBABA_ECS_INSTANCE_ID:?required}"
: "${CHANGE_SOCIETY_RELEASE:?required}"

aliyun ecs DescribeInstances --RegionId "$ALIBABA_REGION_ID" --InstanceIds "[\"$ALIBABA_ECS_INSTANCE_ID\"]" >/dev/null

echo "ECS access verified for release $CHANGE_SOCIETY_RELEASE."
echo "Deploy hackathon/deployments/compose.yaml through your approved ECS SSH/CI channel; inject secrets from the Alibaba secret mechanism and never from Git."
