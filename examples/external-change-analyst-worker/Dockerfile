# Build from repository root:
#   docker build -f hackathon/examples/external-change-analyst-worker/Dockerfile -t agentcore-change-analyst-worker .
FROM python:3.12-slim

WORKDIR /app

COPY hackathon/examples/external-change-analyst-worker/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY hackathon/examples/external-change-analyst-worker/src ./src
COPY hackathon/sdk/python /opt/agentcore-sdk/python

COPY hackathon/backend/change-society-service/src /opt/change-society/src

ENV PYTHONPATH=/app/src:/opt/agentcore-sdk/python:/opt/change-society/src
ENV WORKER_HOST=0.0.0.0
ENV WORKER_PORT=32510

EXPOSE 32510
CMD ["python", "src/run_worker.py"]
