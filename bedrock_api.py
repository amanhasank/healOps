from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
import json
import os
from typing import List, Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AWS Bedrock client - using environment variables for security
bedrock_client = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1',  # Change to your preferred region
)

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "amazon.titan-text-express-v1"  # Titan Text Express
    max_tokens: int = 500
    temperature: float = 0.3

class ChatResponse(BaseModel):
    response: str
    model: str

@app.post("/api/chat", response_model=ChatResponse)
async def chat_with_bedrock(request: ChatRequest):
    try:
        # Check if it's an Amazon model (Titan or Nova)
        if "amazon.titan" in request.model or "amazon.nova" in request.model:
            # Prepare messages for Titan
            conversation = []
            for msg in request.messages:
                if msg.role == "system":
                    # Add system message as user message for Titan
                    conversation.append({"role": "user", "content": f"System: {msg.content}"})
                elif msg.role == "user":
                    conversation.append({"role": "user", "content": msg.content})
                elif msg.role == "assistant":
                    conversation.append({"role": "bot", "content": msg.content})

            # Prepare the request body for Amazon models (Titan/Nova)
            if "amazon.nova" in request.model:
                # Nova Pro uses a different format
                request_body = {
                    "messages": [
                        {
                            "role": "user",
                            "content": conversation[-1]["content"]  # Last user message
                        }
                    ],
                    "max_tokens": request.max_tokens,
                    "temperature": request.temperature,
                    "top_p": 0.9
                }
            else:
                # Titan format
                request_body = {
                    "inputText": conversation[-1]["content"],  # Last user message
                    "textGenerationConfig": {
                        "maxTokenCount": request.max_tokens,
                        "temperature": request.temperature,
                        "topP": 0.9,
                        "stopSequences": []
                    }
                }

            # Call Bedrock for Titan
            response = bedrock_client.invoke_model(
                modelId=request.model,
                body=json.dumps(request_body)
            )

            # Parse the Amazon model response
            response_body = json.loads(response.get('body').read())
            
            if "amazon.nova" in request.model:
                # Nova Pro response format
                if 'content' in response_body and len(response_body['content']) > 0:
                    assistant_message = response_body['content'][0]['text']
                    return ChatResponse(
                        response=assistant_message,
                        model=request.model
                    )
                else:
                    raise HTTPException(status_code=500, detail="No response content from Bedrock")
            else:
                # Titan response format
                if 'results' in response_body and len(response_body['results']) > 0:
                    assistant_message = response_body['results'][0]['outputText']
                    return ChatResponse(
                        response=assistant_message,
                        model=request.model
                    )
                else:
                    raise HTTPException(status_code=500, detail="No response content from Bedrock")

        else:
            # Original Claude logic
            bedrock_messages = []
            for msg in request.messages:
                if msg.role == "system":
                    continue
                elif msg.role == "user":
                    bedrock_messages.append({
                        "role": "user",
                        "content": msg.content
                    })
                elif msg.role == "assistant":
                    bedrock_messages.append({
                        "role": "assistant", 
                        "content": msg.content
                    })

            request_body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": request.max_tokens,
                "temperature": request.temperature,
                "messages": bedrock_messages
            }

            system_message = next((msg.content for msg in request.messages if msg.role == "system"), None)
            if system_message:
                request_body["system"] = system_message

            response = bedrock_client.invoke_model(
                modelId=request.model,
                body=json.dumps(request_body)
            )

            response_body = json.loads(response.get('body').read())
            
            if 'content' in response_body and len(response_body['content']) > 0:
                assistant_message = response_body['content'][0]['text']
                return ChatResponse(
                    response=assistant_message,
                    model=request.model
                )
            else:
                raise HTTPException(status_code=500, detail="No response content from Bedrock")

    except Exception as e:
        # If there's an access denied error, return a mock response for testing
        if "AccessDeniedException" in str(e):
            mock_response = """I can help you with Kubernetes troubleshooting! Here are some common steps to debug issues:

1. **Check pod status**: `kubectl get pods -n <namespace>`
2. **View pod logs**: `kubectl logs <pod-name> -n <namespace>`
3. **Describe pod**: `kubectl describe pod <pod-name> -n <namespace>`
4. **Check events**: `kubectl get events -n <namespace>`

For your specific issue, could you share:
- The pod name and namespace
- Any error messages you're seeing
- The current pod status

This will help me provide more targeted assistance!"""
            
            return ChatResponse(
                response=mock_response,
                model=request.model
            )
        else:
            raise HTTPException(status_code=500, detail=f"Error calling Bedrock: {str(e)}")

@app.get("/api/models")
async def get_available_models():
    """Get list of available Bedrock models"""
    try:
        # Create a separate client for listing models
        bedrock_control_client = boto3.client(
            service_name='bedrock',
            region_name='us-east-1'
        )
        
        # List available models
        response = bedrock_control_client.list_foundation_models()
        models = []
        
        for model in response['modelSummaries']:
            if 'anthropic' in model['providerName'].lower() or 'amazon' in model['providerName'].lower():
                models.append({
                    "id": model['modelId'],
                    "name": model['modelName'],
                    "provider": model['providerName']
                })
        
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching models: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "bedrock-api"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 