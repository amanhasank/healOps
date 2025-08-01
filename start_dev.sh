#!/bin/bash

echo "🚀 Starting HealOps with AWS Bedrock Integration"
echo "================================================"

# Check if Python dependencies are installed
echo "📦 Checking Python dependencies..."
# inside start_dev.sh before installing Python dependencies

if [ ! -d "venv" ]; then
  echo "🐍 Creating virtual environment..."
  python3 -m venv venv
fi

echo "📦 Activating virtual environment..."
source venv/bin/activate

echo "📦 Installing Python dependencies..."
pip install uvicorn
pip install -r requirements.txt

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

# Start the backend servers
echo "🔧 Starting HealOps backend (main.py) on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
HEALOPS_BACKEND_PID=$!

sleep 2

echo "🤖 Starting Bedrock API backend (bedrock_api.py) on port 8001..."
uvicorn bedrock_api:app --host 0.0.0.0 --port 8001 --reload &
BEDROCK_BACKEND_PID=$!

# Wait a moment for backends to start
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
    kill $HEALOPS_BACKEND_PID 2>/dev/null
    kill $BEDROCK_BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait 