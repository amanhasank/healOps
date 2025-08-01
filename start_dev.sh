#!/bin/bash

echo "🚀 Starting HealOps with AWS Bedrock Integration"
echo "================================================"

# Check if Python dependencies are installed
echo "📦 Checking Python dependencies..."
if ! python3 -c "import fastapi, boto3, uvicorn" 2>/dev/null; then
    echo "Installing Python dependencies..."
    pip3 install -r requirements.txt
fi

# Check if Node.js dependencies are installed
echo "📦 Checking Node.js dependencies..."
if [ ! -d "devops-gpt-main/node_modules" ]; then
    echo "Installing Node.js dependencies..."
    cd devops-gpt-main
    npm install
    cd ..
fi

# Check if credentials are set up
if [ ! -f ".env" ]; then
    echo "🔐 Setting up AWS credentials..."
    python3 setup_credentials.py
fi

# Start the backend server
echo "🔧 Starting backend server..."
python3 bedrock_api.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start the frontend server
echo "🎨 Starting frontend server..."
cd devops-gpt-main
npm start &
FRONTEND_PID=$!

echo "✅ Both servers are starting..."
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait 