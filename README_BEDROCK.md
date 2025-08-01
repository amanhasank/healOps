# HealOps with AWS Bedrock Integration

This project has been updated to use AWS Bedrock instead of OpenRouter for the AI chat functionality.

## 🚀 Quick Start

1. **Set up AWS Credentials**:
   ```bash
   python3 setup_credentials.py
   ```
   Enter your AWS Secret Access Key when prompted.

2. **Start the Application**:
   ```bash
   ./start_dev.sh
   ```

This will start both the backend (port 8000) and frontend (port 3000) servers.

## 🔧 Manual Setup

### Backend Setup
1. Install Python dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```

2. Set up AWS credentials:
   ```bash
   python3 setup_credentials.py
   ```

3. Start the backend server:
   ```bash
   python3 bedrock_api.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd devops-gpt-main
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the frontend server:
   ```bash
   npm start
   ```

## 🔐 AWS Configuration

### Required AWS Permissions
Your AWS user (team404) needs the following permissions:
- `bedrock:InvokeModel`
- `bedrock:ListFoundationModels`

### IAM Policy Example
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:ListFoundationModels"
            ],
            "Resource": "*"
        }
    ]
}
```

## 🌐 API Endpoints

### Chat Endpoint
- **URL**: `POST /api/chat`
- **Description**: Send messages to AWS Bedrock
- **Request Body**:
  ```json
  {
    "messages": [
      {"role": "system", "content": "You are a DevOps expert..."},
      {"role": "user", "content": "How do I debug a pod issue?"}
    ],
    "model": "anthropic.claude-3-sonnet-20240229-v1:0",
    "max_tokens": 500,
    "temperature": 0.3
  }
  ```

### Models Endpoint
- **URL**: `GET /api/models`
- **Description**: List available Bedrock models

### Health Check
- **URL**: `GET /health`
- **Description**: Check if the service is running

## 🔄 Changes Made

### Removed
- OpenRouter API configuration
- OpenRouter API key
- Direct frontend-to-OpenRouter communication

### Added
- AWS Bedrock integration
- Secure credential management
- Backend API layer
- CORS support for frontend-backend communication

## 🛠️ Troubleshooting

### Common Issues

1. **"Unable to fetch answer" error**:
   - Check if the backend server is running on port 8000
   - Verify AWS credentials are correctly set
   - Ensure your AWS user has Bedrock permissions

2. **CORS errors**:
   - The backend includes CORS middleware
   - If issues persist, check the browser console for specific errors

3. **AWS authentication errors**:
   - Run `python3 setup_credentials.py` again
   - Verify your AWS credentials are correct
   - Check if your AWS user has the required permissions

### Debug Mode
To run the backend in debug mode:
```bash
uvicorn bedrock_api:app --reload --host 0.0.0.0 --port 8000
```

## 📝 Environment Variables

The following environment variables are used:
- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key
- `AWS_DEFAULT_REGION`: AWS region (default: us-east-1)

## 🔒 Security Notes

- AWS credentials are stored in the `.env` file
- The `.env` file should be added to `.gitignore`
- Never commit AWS credentials to version control
- Consider using AWS IAM roles for production deployments

## 🎯 Next Steps

1. Test the chat functionality with Kubernetes troubleshooting questions
2. Monitor AWS Bedrock usage and costs
3. Consider implementing rate limiting for production use
4. Add error handling for specific AWS Bedrock error codes 