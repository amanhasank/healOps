#!/usr/bin/env python3
"""
Script to check AWS Bedrock access and help troubleshoot issues
"""
import boto3
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_bedrock_access():
    print("🔍 Checking AWS Bedrock Access")
    print("=" * 40)
    
    try:
        # Create Bedrock client
        bedrock = boto3.client('bedrock', region_name='us-east-1')
        
        # List available models
        print("📋 Available models:")
        response = bedrock.list_foundation_models()
        
        anthropic_models = []
        for model in response['modelSummaries']:
            if 'anthropic' in model['providerName'].lower():
                anthropic_models.append({
                    'id': model['modelId'],
                    'name': model['modelName'],
                    'provider': model['providerName']
                })
                print(f"  ✅ {model['modelName']} ({model['modelId']})")
        
        print(f"\n📊 Found {len(anthropic_models)} Anthropic models")
        
        # Try to invoke a simple model
        print("\n🧪 Testing model invocation...")
        
        # Try Claude Instant first
        test_model = "anthropic.claude-instant-v1"
        
        bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')
        
        test_payload = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 50,
            "messages": [
                {
                    "role": "user",
                    "content": "Hello, this is a test message."
                }
            ]
        }
        
        try:
            response = bedrock_runtime.invoke_model(
                modelId=test_model,
                body=json.dumps(test_payload)
            )
            
            response_body = json.loads(response.get('body').read())
            if 'content' in response_body and len(response_body['content']) > 0:
                print(f"✅ Successfully invoked {test_model}")
                print(f"Response: {response_body['content'][0]['text'][:100]}...")
                return True
            else:
                print(f"❌ No response content from {test_model}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to invoke {test_model}: {str(e)}")
            
            if "AccessDeniedException" in str(e):
                print("\n🔧 To fix this issue:")
                print("1. Go to AWS Bedrock Console: https://us-east-1.console.aws.amazon.com/bedrock/")
                print("2. Click on 'Model access' in the left sidebar")
                print("3. Find 'Anthropic' and click 'Manage model access'")
                print("4. Enable the models you want to use (Claude Instant, Claude 2, etc.)")
                print("5. Wait a few minutes for the changes to take effect")
                print("\nAlternatively, you can use the AWS CLI:")
                print("aws bedrock put-model-invocation-logging-configuration --logging-config '{\"loggingConfig\":{\"cloudWatchConfig\":{\"logGroupName\":\"bedrock-logs\",\"roleArn\":\"arn:aws:iam::YOUR_ACCOUNT:role/bedrock-logging-role\"}}}'")
            
            return False
            
    except Exception as e:
        print(f"❌ Error checking Bedrock access: {str(e)}")
        return False

if __name__ == "__main__":
    check_bedrock_access() 