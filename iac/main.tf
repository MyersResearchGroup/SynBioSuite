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
      # Profile
      id   = "14dad69e-099b-42c9-810b-d002981feec1"
      type = "Scope"
    }
    resource_access {
      # Files.ReadWrite
      id   = "5c28f0bf-8a70-41f1-8ab2-9032436ddb65"
      type = "Scope"
    }
  }
}
