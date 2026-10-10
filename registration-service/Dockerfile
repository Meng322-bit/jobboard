# Use Node 24 (LTS) - slim (not alpine) to avoid native module build issues with bcrypt
FROM node:24-slim

# Set working directory inside the container
WORKDIR /app

# Copy package files first (Docker layer caching - only reinstalls deps if these change)
COPY package*.json ./

# Install dependencies (bcrypt needs python3/make/g++ to build its native binding)
RUN apt-get update && apt-get install -y python3 make g++ \
    && npm install --omit=dev \
    && apt-get purge -y python3 make g++ \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Copy the rest of the source code
COPY . .

# Expose the port this service listens on
EXPOSE 5001

# Start the service
CMD ["node", "index.js"]