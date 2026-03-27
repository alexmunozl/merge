#!/bin/bash

set -e

echo "🚀 Starting Opera Profile Merger Deployment"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p uploads

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build

echo "🐳 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗃️ Running database migrations..."
docker-compose exec app npm run migrate

# Seed database with initial data
echo "🌱 Seeding database..."
docker-compose exec app npm run seed

# Check if services are running
echo "🔍 Checking service health..."
sleep 5

if curl -f http://localhost/api/system/health > /dev/null 2>&1; then
    echo "✅ Application is running and healthy"
else
    echo "❌ Application health check failed"
    docker-compose logs app
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Service URLs:"
echo "  - Application: http://localhost"
echo "  - API Documentation: http://localhost/api-docs"
echo "  - Database: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Access app container: docker-compose exec app sh"
