To use Terraform:
1. Download [Azure command line interface](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest)
2. Run az login 
3. Install [Terraform](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
4. Run terraform validate
5. Run terraform plan
6. Run terraform apply

In the .env file, set the following variables:
VITE_CLIENT_ID=<your-newly-created-app-client-id-from-azure>

Then run the app normally.