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
RUN cp -r src/scripts/*.js dist/scripts/ || true

# Create a script to wait for the database
RUN echo '#!/bin/bash \n\
echo "Waiting for PostgreSQL to be ready..." \n\
max_attempts=30 \n\
attempt=0 \n\
while [ $attempt -lt $max_attempts ]; do \n\
  attempt=$((attempt+1)) \n\
  echo "Attempt $attempt of $max_attempts" \n\
  if node -e "const { Client } = require(\"pg\"); const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); client.connect().then(() => { console.log(\"Database connection successful\"); client.end(); process.exit(0); }).catch(err => { console.error(\"Connection failed:\", err.message); process.exit(1); });"; then \n\
    echo "Database is ready!" \n\
    break \n\
  fi \n\
  echo "Database not ready yet, waiting..." \n\
  sleep 2 \n\
done \n\
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
# Note: DATABASE_URL will be injected by Railway from the environment

# Start the application using the wait-for-db script
ENTRYPOINT ["/app/wait-for-db.sh"]
CMD ["node", "server.js"]