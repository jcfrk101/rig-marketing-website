FROM node:20-alpine AS service-builder

ARG NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED 1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

WORKDIR /rig-marketing-website
COPY . .

RUN yarn install --frozen-lockfile --ignore-engines && yarn build


FROM node:20-alpine AS service-runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=service-builder /rig-marketing-website/public ./public
COPY --from=service-builder /rig-marketing-website/package.json ./package.json

COPY --from=service-builder --chown=nextjs:nodejs /rig-marketing-website/.next/standalone ./
COPY --from=service-builder --chown=nextjs:nodejs /rig-marketing-website/.next/static ./.next/static

USER nextjs

EXPOSE 8080

ENV PORT 8080

CMD ["node", "server.js"]
