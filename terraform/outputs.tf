# outputs so we know what got created
output "app_url" {
  description = "URL of the deployed app"
  value       = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "app_name" {
  description = "Name of the web app"
  value       = azurerm_linux_web_app.main.name
}

output "app_insights_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}
