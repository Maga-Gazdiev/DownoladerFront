FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
USER node
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server.js"]
