# Frontend — build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production: nginx serves static files (API is configured via VITE_API_URL at build; reverse proxy in front can route /api to backend)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN echo 'server { listen 80; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
