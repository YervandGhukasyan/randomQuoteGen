terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.45"
    }
  }
}

provider "azurerm" {
  features {}
}

# resource group for all our stuff
resource "azurerm_resource_group" "main" {
  name     = "rg-quote-api-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "quote-api"
    ManagedBy   = "terraform"
  }
}

# app service plan - using the cheap one for now
resource "azurerm_service_plan" "main" {
  name                = "asp-quote-api-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_resource_group.main.location
  os_type            = "Linux"
  sku_name           = var.environment == "prod" ? "P1v2" : "B1"

  tags = {
    Environment = var.environment
    Project     = "quote-api"
  }
}

# the actual web app
resource "azurerm_linux_web_app" "main" {
  name                = "app-quote-api-${var.environment}-${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_service_plan.main.location
  service_plan_id    = azurerm_service_plan.main.id

  site_config {
    always_on = var.environment == "prod" ? true : false
    
    application_stack {
      node_version = "18-lts"
    }

    app_command_line = "npm start"
  }

  app_settings = {
    "NODE_ENV"           = var.environment == "prod" ? "production" : "development"
    "PORT"              = "8000"
    "QUOTABLE_API_URL"  = "https://api.quotable.io"
    "DUMMYJSON_API_URL" = "https://dummyjson.com"
    "DATABASE_PATH"     = "/tmp/quotes.db"  # not ideal but whatever
    "LOG_LEVEL"         = var.environment == "prod" ? "info" : "debug"
  }

  tags = {
    Environment = var.environment
    Project     = "quote-api"
  }
}

# random suffix so we don't get naming conflicts
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# application insights for monitoring (probably overkill but eh)
resource "azurerm_application_insights" "main" {
  name                = "appi-quote-api-${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location           = azurerm_resource_group.main.location
  application_type   = "Node.JS"

  tags = {
    Environment = var.environment
    Project     = "quote-api"
  }
}
