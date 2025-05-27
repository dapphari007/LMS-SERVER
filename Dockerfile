FROM node:18.18

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies including reflect-metadata
RUN npm install

# Copy the rest of the application
COPY . .

# Copy the Railway-specific .env file
COPY .env.railway .env

# Generate Prisma client
RUN npx prisma generate

# Create scripts directory
RUN mkdir -p dist/scripts

# Build the application
RUN npm run build

# Ensure scripts are copied (in case the build script fails to copy them)
RUN mkdir -p dist/scripts
RUN cp -r src/scripts/*.js dist/scripts/ || true

# Copy the database initialization script
COPY src/scripts/init-railway-db.js dist/scripts/

# Create a script to wait for the database
RUN echo '#!/bin/bash \n\
echo "Waiting for PostgreSQL to be ready..." \n\
max_attempts=30 \n\
attempt=0 \n\
\n\
# Try internal connection first (preferred for Railway)\n\
echo "Trying internal Railway connection..."\n\
internal_url="postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@postgres.railway.internal:5432/railway"\n\
\n\
while [ $attempt -lt $max_attempts ]; do \n\
  attempt=$((attempt+1)) \n\
  echo "Attempt $attempt of $max_attempts (internal)" \n\
  if node -e "const { Client } = require(\"pg\"); const client = new Client({ connectionString: \"$internal_url\", ssl: { rejectUnauthorized: false } }); client.connect().then(() => { console.log(\"Internal database connection successful\"); process.env.DATABASE_URL = \"$internal_url\"; client.end(); process.exit(0); }).catch(err => { console.error(\"Internal connection failed:\", err.message); process.exit(1); });"; then \n\
    echo "Internal database connection is ready!" \n\
    export DATABASE_URL=\"$internal_url\"\n\
    echo "Set DATABASE_URL to internal URL"\n\
    break \n\
  fi \n\
  \n\
  if [ $attempt -eq 10 ]; then\n\
    echo "Internal connection failed after 10 attempts, trying external URL..."\n\
    break\n\
  fi\n\
  \n\
  echo "Internal database not ready yet, waiting..." \n\
  sleep 2 \n\
done \n\
\n\
# If internal connection failed, try external connection\n\
if [ $attempt -eq 10 ]; then\n\
  echo "Trying external Railway connection..."\n\
  external_url="postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway"\n\
  attempt=0\n\
  \n\
  while [ $attempt -lt $max_attempts ]; do \n\
    attempt=$((attempt+1)) \n\
    echo "Attempt $attempt of $max_attempts (external)" \n\
    if node -e "const { Client } = require(\"pg\"); const client = new Client({ connectionString: \"$external_url\", ssl: { rejectUnauthorized: false } }); client.connect().then(() => { console.log(\"External database connection successful\"); process.env.DATABASE_URL = \"$external_url\"; client.end(); process.exit(0); }).catch(err => { console.error(\"External connection failed:\", err.message); process.exit(1); });"; then \n\
      echo "External database connection is ready!" \n\
      export DATABASE_URL=\"$external_url\"\n\
      echo "Set DATABASE_URL to external URL"\n\
      break \n\
    fi \n\
    \n\
    echo "External database not ready yet, waiting..." \n\
    sleep 2 \n\
  done \n\
fi\n\
\n\
if [ $attempt -eq $max_attempts ]; then \n\
  echo "Database connection failed after $max_attempts attempts" \n\
  echo "Starting server anyway..." \n\
fi \n\
exec "$@"' > /app/wait-for-db.sh

# Make the script executable
RUN chmod +x /app/wait-for-db.sh

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Set database environment variables directly in the Dockerfile as a fallback
ENV DATABASE_URL=postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@postgres.railway.internal:5432/railway
ENV DATABASE_PUBLIC_URL=postgresql://postgres:DDzRHavWnatSRwZKlrPRQQfphjKRHEna@maglev.proxy.rlwy.net:31901/railway
ENV PGHOST=postgres.railway.internal
ENV PGPORT=5432
ENV PGDATABASE=railway
ENV PGUSER=postgres
ENV PGPASSWORD=DDzRHavWnatSRwZKlrPRQQfphjKRHEna
ENV PGSSLMODE=require

# Start the application using the wait-for-db script
ENTRYPOINT ["/app/wait-for-db.sh"]
CMD ["node", "server.js"]