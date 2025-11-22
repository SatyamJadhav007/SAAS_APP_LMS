# 1) Builder Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Pass ONLY frontend env vars as build args
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_VAPI_WEB_TOKEN

# Make them available during `next build`(NOTE:Only for dockerizing demo. don't use env variables in prod. environments,The application is deployed on vercel)
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_VAPI_WEB_TOKEN=$NEXT_PUBLIC_VAPI_WEB_TOKEN

COPY package.json package-lock.json ./

# Install all dependencies (including dev)
RUN npm install

# Copy the full codebase
COPY . .

# Build Next.js
RUN npm run build



# 2) Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "start"]
