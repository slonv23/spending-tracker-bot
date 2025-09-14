locals {
  env_content = file("${path.cwd}/../.env")  # Read the .env file

  gserviceaccount_content = file("${path.cwd}/../secrets/gserviceaccount.json")  # Read the .env file

  # Split .env into lines, ignore comments/empty lines, extract KEY and VALUE
  env_kv_pairs = [
    for l in split("\n", local.env_content) :
    regex("^\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)\\s*$", l)
    if length(trimspace(l)) > 0
    && !startswith(trimspace(l), "#")
    && can(regex("^\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)\\s*$", l))
  ]

  # Convert to map: { KEY = VALUE, ... } and trim spaces/control chars
  env_file_vars = {
    for p in local.env_kv_pairs :
    p[0] => trimspace(p[1])
  }

  # Add additional environment variables
  env_vars = merge(
    local.env_file_vars,
    {
      GSERVICEACCOUNT = local.gserviceaccount_content
    }
  )
}

locals {
  env = local.env_file_vars["ENV"]
  project_name = local.env_file_vars["PROJECT_NAME"]
  lambda_name = "${local.env_file_vars["LAMBDA_NAME_PREFIX"]}-${local.env_file_vars["ENV"]}"
  lambda_region = local.env_file_vars["LAMBDA_REGION"]
}

variable "params_to_store" {
  type    = list(string)
  default = ["BOT_TOKEN", "GSERVICEACCOUNT"]  # Add your variable names here
}

resource "aws_ssm_parameter" "ssm_params" {
  for_each = toset(var.params_to_store)  # Convert list to set

  name        = "/${local.lambda_name}/${each.value}"  # SSM path (e.g., /my-app/DB_HOST)
  type        = "SecureString"           # Encrypt sensitive values
  value       = lookup(local.env_vars, each.value, "MISSING")
  description = "Stored from local .env file"
  overwrite   = true

  tags = {
    Source = ".env"
    Environment = local.env
    Project     = local.project_name
  }
}