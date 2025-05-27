FROM node:18.18

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies including reflect-metadata
RUN npm install

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]