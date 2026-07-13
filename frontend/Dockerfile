FROM node:24-alpine AS build
WORKDIR /app
COPY hackathon/frontend/package*.json ./
RUN npm ci
COPY hackathon/frontend ./
ARG NEXT_PUBLIC_CHANGE_SOCIETY_API_URL
ENV NEXT_PUBLIC_CHANGE_SOCIETY_API_URL=${NEXT_PUBLIC_CHANGE_SOCIETY_API_URL}
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=32501
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 32501
CMD ["node", "server.js"]
