# AgentCore: Three Minute Hackathon Presentation

Hi everyone, today I want to introduce AgentCore and Change Society, its Track Three demo, which shows intelligent agents coordinating tasks, communication, and human oversight.

Using several agents raises questions about ownership, shared information, repeated work, conflicting decisions, and accountability.

AgentCore solves this with Agent Tickets that record each task, required skill, owner, progress, and history.

By sharing structured messages, agents can negotiate conflicts and request human approval before high risk work continues.

On the Run page, we choose Password hashing migration compatibility — move hashing to Argon2 while keeping legacy SHA256 users able to sign in. Load latest demo reopens a saved run without starting another.

After the run opens in Work queue, Guide explains what this password-migration demo proves and where to click next.

Agent Story frames the trap: upgrading hashes is good security, unless cutting over too early locks out legacy users on login, and it walks the agent exchange in order.

Work Queue shows each Agent Ticket finishing — Context Scout gathers evidence, Change Analyst interprets the request, Impact Analyst finds wider effects, and Policy Guardian checks Security approval, all using Qwen.

Messages lists the full specialist protocol trail for audit on this same Argon2 migration run.

Review pauses for the Security team when specialists disagree on lockout and approval risk, so the cutover cannot move forward unnoticed; after approval the decision becomes reusable memory.

Results compares society coverage to a single agent on this scenario and across seven scenarios — twenty five of twenty six critical impacts and all ten policies versus seven impacts and no policies.

Details keeps the original request text and tracking IDs so screens match API logs for Password hashing migration compatibility.

The Coordinator, acting as the Judge, chooses a safe plan with tickets for lazy migration, legacy login tests, and Frontend Delivery.

The system supports Alibaba Cloud deployment, while AgentCore gives agents ownership, shared information, conflict resolution, memory, and human oversight, keeping people in control. Thank you.
