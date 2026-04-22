@description('Azure region for the container registry.')
param location string = resourceGroup().location

@description('Short environment name. Used in resource names.')
@minLength(2)
@maxLength(16)
param environmentName string = 'prod'

@description('Azure Container Registry name. Must be globally unique.')
param containerRegistryName string = toLower(replace('ourowork${environmentName}${uniqueString(subscription().id, resourceGroup().id)}', '-', ''))

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
  }
}

output containerRegistryName string = registry.name
output containerRegistryLoginServer string = registry.properties.loginServer
