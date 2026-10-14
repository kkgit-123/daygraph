# Use Node.js for building and serving
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Install a simple server to serve the static files
RUN npm install -g serve

# Expose the port Cloud Run expects (8080 by default)
EXPOSE 8080

# Start the server on port 8080, serving the 'dist' directory
# -s flag is for Single Page Applications (handles routing)
CMD ["serve", "-s", "dist", "-l", "8080"]
