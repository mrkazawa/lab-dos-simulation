# Dockerfile for TCP/UDP server
FROM node:18-alpine
WORKDIR /app
COPY tcp-server.js ./
COPY udp-server.js ./
CMD ["node", "tcp-server.js"] # Default to TCP, can override to udp-server.js
