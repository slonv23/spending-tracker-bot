output "ssm_param_arns" {
  value = { for k, v in aws_ssm_parameter.ssm_params : k => v.arn }
}

output "bot_name" {
  value = local.env_file_vars["BOT_NAME"]
  description = "Name of the bot. Used to generate deep links"
}

output "lambda_role_arn" {
  value = local.env_file_vars["LAMBDA_ROLE_ARN"]
  description = "ARN of the existing IAM role for the Lambda function"
}

output "lambda_region" {
  value = local.env_file_vars["LAMBDA_REGION"]
  description = "AWS region for deploying the Lambda function"
}

output "lambda_name_prefix" {
  value = local.env_file_vars["LAMBDA_NAME_PREFIX"]
  description = "Prefix of the Lambda function. The final name is `[lambda_name_prefix]-[env]`"
}

output "project_name" {
  value = local.env_file_vars["PROJECT_NAME"]
  description = "Name of the project"
}

output "env" {
  value = local.env_file_vars["ENV"]
  description = "Environment for the deployment. Used as a suffix in the Lambda function name and other resources names. Used to associate tags"
}

output "lambda_name" {
  value = local.lambda_name
  description = "Name of the lambda function. Concatenation of 'lambda_name_prefix' and 'env'"
}
