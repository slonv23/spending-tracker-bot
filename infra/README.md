# Deployment Guide
## Prerequisites
- Terraform
- AWS CLI

## Configuration

1. Create a role in AWS with the following permissions:
    
    ```
     {
         "Version": "2012-10-17",
         "Statement": [
             {
                 "Effect": "Allow",
                 "Action": "logs:CreateLogGroup",
                 "Resource": "arn:aws:logs:*:*:*"
             },
             {
                 "Effect": "Allow",
                 "Action": [
                     "logs:CreateLogStream",
                     "logs:PutLogEvents"
                 ],
                 "Resource": [
                     "arn:aws:logs:*:*:*"
                 ]
             },
             {
                 "Effect": "Allow",
                 "Action": "ssm:GetParameter",
                 "Resource": "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot/*"
             },
             {
                 "Effect": "Allow",
                 "Action": "ssm:GetParameters",
                 "Resource": "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot/*"
             }
         ]
     }
    ```

2. Update variables in `variables.tf`: specify ARN of the role you created and the AWS region

## Steps to Deploy
1. **Build the Application**  
   Compile the TypeScript code to JavaScript:
   ```bash
   npm run build
   ```
2. **Initialize Terraform**  
   Install the required Terraform plugins (only needed once):
   ```bash
   terraform init
   ```
3. **Validate Terraform Configuration**  
   Check for syntax errors:
   ```bash
   terraform validate
   ```
4. **Configure AWS Credentials**  
   You have two options to set up your AWS credentials:

   **Option 1: AWS SSO Login**  
   Run the following command and follow the prompts:
   ```bash
   aws sso login --profile [Your-Profile]
   ```

   If you forgot your profile id this command can be useful: `aws configure list-profiles`

   **Option 2: AWS Credentials File**

   Edit the AWS credentials file (typically at `~/.aws/credentials` on Linux/macOS or `%USERPROFILE%\.aws\credentials` on Windows) and add:

    ```
    [Your-Profile]
    aws_access_key_id = YOUR_ACCESS_KEY
    aws_secret_access_key = YOUR_SECRET_KEY
    ```

5. **Set the active profile:**
   - On Windows (PowerShell):
     ```powershell
     $env:AWS_PROFILE = "[Your-Profile]"
     ```
   - On Linux/macOS (Bash):
     ```bash
     export AWS_PROFILE="[Your-Profile]"
     ```
     
   **Verify your AWS configuration** by running:

    ```bash
    aws configure list
    ```
6. **Deploy the Infrastructure**  
   Apply the Terraform configuration to create the AWS resources and deploy the Lambda function:
   ```bash
   terraform apply
   ```
   This command will:
    - Create the AWS resources defined in your Terraform configuration
    - Package the `dist` folder into a zip file
    - Update the Lambda function with the new code

7. **Remember to register your bot with Telegram!**