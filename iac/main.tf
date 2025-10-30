resource "azuread_application" "synbio-suite" {
  display_name     = "SynBio Suite"
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"
  api {
    requested_access_token_version = 2
  }
}
