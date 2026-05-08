# bootcamp/secret-phrase

This repo is a template for spinning up Nx powered repos, for both web and mobile.

## Create a repo

Refer to official documentation: [https://docs.cbhq.net/frontend/nx/new-repo](https://docs.cbhq.net/frontend/nx/new-repo)

## Running Nx

Once everything is copied and configured, run:

```shell
yarn install
yarn setup
```

You can now run Nx projects like `nx run <project>:build`. For more information on this architecture, [view our official docs](https://docs.cbhq.net/frontend/nx/what-is).

## Adding new projects

For the latest instructions, check out the [Frontend docs portal](https://docs.cbhq.net/frontend).

- [Create an application](https://docs.cbhq.net/frontend/nx/new-app)
- [Create a package](https://docs.cbhq.net/frontend/nx/new-package)
- [Create a library](https://docs.cbhq.net/frontend/nx/new-library)

## Deploying to Production for The First Time

Due to security concerns, the New Service Maker is unable to automatically provision production infrastructure at this time.
When you are ready to deploy your service to production, there are a few steps you must take:

### 1. Enable the Production Terraform Workspace

By default, the Infra Provisioner won't provision production your production Terraform workspace.

- Modify your `.infraprovisioner.yaml` file and uncomment the production workspace.
- Open a Pull Request.

### 2. Deploy via Codeflow V2

You are now ready to deploy via Codeflow V2!

You can either:

- Manually deploy to Production via the [Codeflow V2 UI](https://dev.cbhq.net/projects).
- Enable automatic Production deployments by editing your `terraform/pipelines/main.tf` file and setting `automatic = true` on the subscription to your production stack!
