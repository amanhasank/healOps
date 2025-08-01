#!/usr/bin/env python3
"""
Helper script to set up AWS credentials for Bedrock integration
"""
import getpass
import os
from pathlib import Path

def setup_credentials():
    print("🔐 AWS Bedrock Credentials Setup")
    print("=" * 40)
    
    # Get credentials from user
    access_key = input("Enter your AWS Access Key ID (AKIA5ZSC3SETS5QZGQNM): ").strip()
    if not access_key:
        access_key = "AKIA5ZSC3SETS5QZGQNM"
    
    secret_key = getpass.getpass("Enter your AWS Secret Access Key: ").strip()
    
    if not secret_key:
        print("❌ Secret key is required!")
        return False
    
    # Create .env file with credentials (bedrock_api.py now uses environment variables)
    env_content = f"""AWS_ACCESS_KEY_ID={access_key}
AWS_SECRET_ACCESS_KEY={secret_key}
AWS_DEFAULT_REGION=us-east-1
"""
    
    env_file = Path(".env")
    env_file.write_text(env_content)
    print("✅ Created .env file with credentials")
    
    # Also create a .env file for additional security
    env_content = f"""AWS_ACCESS_KEY_ID={access_key}
AWS_SECRET_ACCESS_KEY={secret_key}
AWS_DEFAULT_REGION=us-east-1
"""
    
    env_file = Path(".env")
    env_file.write_text(env_content)
    print("✅ Created .env file with credentials")
    
    print("\n🎉 Setup complete!")
    print("You can now run the backend server with:")
    print("python bedrock_api.py")
    
    return True

if __name__ == "__main__":
    setup_credentials() 