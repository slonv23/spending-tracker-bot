### config-from-env

Loads environment variables from a local `.env` and related local secrets for deployment and runtime. Secure values are not exposed; they are stored in AWS SSM Parameter Store (SecureString) and referenced by ARN.
