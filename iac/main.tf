resource "azuread_application" "synbio_suite" {
  display_name     = "SynBio Suite"
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"
  api {
    requested_access_token_version = 2
  }
  single_page_application {
    redirect_uris = ["https://synbiosuite.org/cloud-home", "http://localhost:3000/cloud-home"]
  }

  required_resource_access {
    # Microsoft Graph
    resource_app_id = "00000003-0000-0000-c000-000000000000"
    resource_access {
      # User.ReadWrite
      id   = "b4e74841-8e56-480b-be8b-910348b18b4c"
      type = "Scope"
    }
    resource_access {
      # Files.ReadWrite
      id   = "5c28f0bf-8a70-41f1-8ab2-9032436ddb65"
      type = "Scope"
    }
  }
  required_resource_access {
    # Office 365 Management
    resource_app_id = "c5393580-f805-4401-95e8-94b7a6ef2fc2"

    resource_access {
      # ActivityFeed.Read
      id   = "594c1fb6-4f81-4475-ae41-0c394909246c"
      type = "Role"
    }
  }
}
