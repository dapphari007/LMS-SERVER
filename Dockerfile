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

# Build the application
RUN npm run build

# Expose the port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# Note: DATABASE_URL will be injected by Railway from the environment

# Start the application using the simple server (which will try to start the main app)
CMD ["node", "server.js"]