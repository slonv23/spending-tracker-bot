# to test: run `terraform plan`
# to deploy: run `terraform apply`

module "config_from_env" {
  source = "./config-from-env"
}

locals {
  env = module.config_from_env.env
  lambda_region = module.config_from_env.lambda_region
  lambda_name = module.config_from_env.lambda_name
  lambda_role_arn = module.config_from_env.lambda_role_arn
  bot_name = module.config_from_env.bot_name
  project_name = module.config_from_env.project_name
}

provider "aws" {
  region = local.lambda_region
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "../dist/index.js"
  output_path = "lambda_function.zip"
}

resource "aws_lambda_function" "bot_lambda" {
  filename         = "lambda_function.zip"
  function_name    = local.lambda_name
  role             = local.lambda_role_arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs22.x"
  memory_size      = 256
  timeout          = 15

  environment {
    variables = {
      ENV = local.env
      BOT_NAME = local.bot_name
      BOT_TOKEN = module.config_from_env.ssm_param_arns["BOT_TOKEN"]
      GSERVICEACCOUNT = module.config_from_env.ssm_param_arns["GSERVICEACCOUNT"]
    }
  }

  tags = {
    Environment = local.env
    Project     = local.project_name
  }
}

resource "aws_lambda_function_url" "bot_lambda_url" {
  function_name = aws_lambda_function.bot_lambda.function_name
  authorization_type = "NONE"  # or AWS_IAM if you want auth

  # optional cors settings here
}

resource "aws_lambda_permission" "allow_public_invoke" {
  statement_id  = "AllowPublicInvoke"
  action        = "lambda:InvokeFunctionUrl"
  function_name = aws_lambda_function.bot_lambda.function_name
  principal     = "*"  # allows all users
  function_url_auth_type = "NONE"
}

resource "aws_dynamodb_table" "user_settings" {
  name         = "user-settings-${local.env}"
  billing_mode = "PROVISIONED"
  hash_key     = "user_id"

  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "user_id"
    type = "N"
  }

  tags = {
    Environment = local.env
    Project     = local.project_name
  }
}

resource "aws_dynamodb_table" "sheets" {
  name         = "sheets-${local.env}"
  billing_mode = "PROVISIONED"
  hash_key     = "sheet_id"

  read_capacity  = 5
  write_capacity = 5

  attribute {
    name = "sheet_id"
    type = "S"
  }

  tags = {
    Environment = local.env
    Project     = local.project_name
  }
}

resource "aws_cloudwatch_log_group" "lambda_log_group" {
  name              = "/aws/lambda/${local.lambda_name}"
  retention_in_days = 14  # Optional: set retention period

  tags = {
    Environment = local.env
    Project     = local.project_name
  }
}

# resource "aws_iam_role" "iam_for_lambda_tf" {
#   name = "iam_for_lambda_tf"
#
#   assume_role_policy = <<EOF
# {
#     "Version": "2012-10-17",
#     "Statement": [
#         {
#             "Effect": "Allow",
#             "Action": "logs:CreateLogGroup",
#             "Resource": "arn:aws:logs:*:*:*"
#         },
#         {
#             "Effect": "Allow",
#             "Action": [
#                 "logs:CreateLogStream",
#                 "logs:PutLogEvents"
#             ],
#             "Resource": [
#                 "arn:aws:logs:*:*:*"
#             ]
#         },
#         {
#             "Effect": "Allow",
#             "Action": "ssm:GetParameter",
#             "Resource": [
#                "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot/*",
#                "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot-dev/*",
#                "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot-stage/*",
#                "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot-prod/*"
#            ]
#         },
#         {
#             "Effect": "Allow",
#             "Action": "ssm:GetParameters",
#             "Resource": [
#                "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot/*",
#                "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot-dev/*",
#                "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot-stage/*",
#                "arn:aws:ssm:eu-central-1:745750384890:parameter/tg_bot-prod/*"
#            ]
#         },
#         {
#             "Effect": "Allow",
#             "Action": [
#                 "dynamodb:GetItem",
#                 "dynamodb:PutItem",
#                 "dynamodb:UpdateItem",
#                 "dynamodb:DeleteItem",
#                 "dynamodb:Query",
#                 "dynamodb:Scan"
#             ],
#             "Resource": "arn:aws:dynamodb:eu-central-1:745750384890:table/*"
#         }
#     ]
# }
# EOF
# }