FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts : le hook husky (prepare) n'a pas de sens dans l'image
RUN npm ci --ignore-scripts
COPY . .
# Variables NEXT_PUBLIC_* : figées au build (URL vue par le navigateur)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_API_MOCKS=false
ARG NEXT_PUBLIC_SHOP_ENABLED=true
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_API_MOCKS=$NEXT_PUBLIC_API_MOCKS \
    NEXT_PUBLIC_SHOP_ENABLED=$NEXT_PUBLIC_SHOP_ENABLED \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
USER node
EXPOSE 3000
CMD ["npm", "run", "start"]
