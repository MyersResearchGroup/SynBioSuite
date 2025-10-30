resource "azuread_application" "synbio-suite" {
  display_name     = "SynBio Suite"
  sign_in_audience = "AzureADandPersonalMicrosoftAccount"
  api {
    requested_access_token_version = 2
  }
  web {
    redirect_uris = [ "https://synbiosuite.org/cloud-home" ]
    homepage_url = "https://synbiosuite.org/"
    logout_url = "https://synbiosuite.org/cloud-logout"
  }
}
