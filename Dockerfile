FROM node:18.18-alpine

# Install necessary build tools and dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Copy prisma schema for generation
COPY prisma ./prisma/

# Install dependencies
RUN npm config set registry https://registry.npmjs.org/ && \
    NODE_ENV=development npm install --verbose

# Generate Prisma client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]