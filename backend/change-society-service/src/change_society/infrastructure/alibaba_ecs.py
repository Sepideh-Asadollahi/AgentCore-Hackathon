from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from typing import Any

from ..domain.models import DependencyError, ValidationError


@dataclass(frozen=True)
class AlibabaEcsTarget:
    region_id: str
    instance_id: str


class AlibabaCloudEcsProof:
    """
    Devpost-required repository proof of Alibaba Cloud service/API use.

    Wraps the official Alibaba Cloud CLI ECS DescribeInstances call used in
    hackathon/deployments/alibaba/deploy-ecs.sh.
    """

    def __init__(self, cli_binary: str = "aliyun") -> None:
        self._cli = cli_binary

    def describe_instance(self, target: AlibabaEcsTarget) -> dict[str, Any]:
        if not target.region_id.strip() or not target.instance_id.strip():
            raise ValidationError("Alibaba ECS region_id and instance_id are required.")
        command = [
            self._cli,
            "ecs",
            "DescribeInstances",
            "--RegionId",
            target.region_id,
            "--InstanceIds",
            json.dumps([target.instance_id]),
        ]
        try:
            completed = subprocess.run(command, check=True, capture_output=True, text=True)
        except FileNotFoundError as exc:
            raise DependencyError("alibaba_cli_missing", "Alibaba Cloud CLI is not installed on this host.", False) from exc
        except subprocess.CalledProcessError as exc:
            raise DependencyError(
                "alibaba_ecs_describe_failed",
                "Alibaba Cloud ECS DescribeInstances failed.",
                False,
            ) from exc
        try:
            return json.loads(completed.stdout)
        except json.JSONDecodeError as exc:
            raise DependencyError("alibaba_ecs_invalid_response", "Alibaba Cloud CLI returned invalid JSON.", False) from exc
