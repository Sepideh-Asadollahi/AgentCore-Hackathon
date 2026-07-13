FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY hackathon/backend/change-society-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY hackathon/backend/change-society-service/src ./src
COPY hackathon/backend/change-society-service/config ./config
ENV PYTHONPATH=/app/src CHANGE_SOCIETY_API_PORT=32500
EXPOSE 32500
CMD ["sh", "-c", "uvicorn change_society.main:app --host 0.0.0.0 --port ${CHANGE_SOCIETY_API_PORT}"]
