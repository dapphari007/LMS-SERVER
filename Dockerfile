FROM node:18.18

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies with specific flags to handle Prisma
RUN npm install --no-optional --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]