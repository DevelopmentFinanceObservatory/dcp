# Deploy (ONE/DFO)

`deploy-dev.yml` builds and pushes the dcp image, then opens a pull
request in `dfo-infra` that moves the `dev` image pin
(`infra/dfo-dev/dcp/image.auto.tfvars`). It runs on every push to `dev`.
Merging that PR triggers dfo-infra's own apply-on-merge workflow, which
performs the actual deploy through `terraform apply`.

dfo-apis and dfo-ai instead deploy with a plain `gcloud run services
update --image=...`, because dfo-infra's Terraform for those services
carries `lifecycle.ignore_changes` on the image. dcp's Cloud Run service
is created inside a pinned upstream Terraform module (datacommons's own
module, vendored into dfo-infra's `dcp` stack) that exposes no
`ignore_changes` seam for the image, so a direct `gcloud run services
update` would be reverted by dfo-infra's next `terraform apply`. This
repo builds and pushes the image and proposes the pin. dfo-infra owns the
service and performs the deploy.

This file documents that workflow only. It's unrelated to the other
directories under `deploy/` (`git`, `helm_charts`, `nl`,
`terraform-custom-datacommons`, `terraform-datacommons-website`), which
are upstream Data Commons deploy assets this fork doesn't use.

## Image naming

Every push builds and pushes one image, referenced two ways:

```
${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/dfo-services-image:dfo-dev-<sha>
${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/dfo-services-image@sha256:<digest>
```

`<sha>` is the full 40-character git SHA of the commit that triggered the
deploy; the tag is for humans browsing Artifact Registry. `<digest>` is
what `deploy-dev.yml` actually pins in dfo-infra: Artifact Registry IAM
has no granularity below the repository, and `dfo-ai-deployer` and
`dfo-apis-deployer` both hold writer on this same `datacommons` repo, so
either could overwrite a tag. A digest pin makes that a no-op, since the
digest names the bytes directly. dfo-infra's validator rejects anything
that isn't a digest pin in this exact shape.

This is the image the GitHub Actions workflow builds and pushes. `just
deploy` is a separate break-glass path. It builds and pushes an
immutable `dfo-<tier>-<sha>` tag by hand, resolves the digest Artifact
Registry assigned it, and prints both, for when CI is down or you need
to test an unmerged commit. It never touches dfo-infra's pin.

## GitHub vars and secrets

`deploy-dev.yml` reads these from the `dev` GitHub Environment, which
exists on this repo with a deployment branch policy restricted to `dev`.
`deploy-prod.yml` reads the same names from the `production` Environment,
with the App pair listed under "Production".

| Name                      | Kind   | Example value                                                                               | Who provides it                                          |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `WIF_PROVIDER`            | secret | `projects/123456789/locations/global/workloadIdentityPools/github/providers/github-actions` | dfo-infra, via `just ENV=dfo-dev handoff dcp`            |
| `WIF_SA`                  | secret | `dfo-dcp-deployer@dev-fin-observatory.iam.gserviceaccount.com`                              | dfo-infra, via `just ENV=dfo-dev handoff dcp`            |
| `DEPLOY_APP_ID`           | secret | `4423611`                                                                                   | this repo (see "dfo-bot GitHub App" below)               |
| `DEPLOY_APP_PRIVATE_KEY`  | secret | *(PEM private key)*                                                                         | this repo (see "dfo-bot GitHub App" below)               |
| `REGION`                  | var    | `northamerica-northeast1`                                                                   | dfo-infra, via `just ENV=dfo-dev handoff dcp`            |
| `PROJECT_ID`              | var    | `dev-fin-observatory`                                                                       | dfo-infra, via `just ENV=dfo-dev handoff dcp`            |
| `AR_REPO`                 | var    | `datacommons`                                                                               | dfo-infra, via `just ENV=dfo-dev handoff dcp`            |
| `AR_CACHE_REPO`           | var    | `dfo-dcp-build-cache`                                                                       | dfo-infra, via `just ENV=dfo-dev handoff dcp`            |
| `DFO_APIS_BASE_URL`       | var    | `https://dfo-dev-apis-zms5lj4zhq-nn.a.run.app`                                              | dfo-infra, via `just ENV=dfo-dev handoff dcp`            |

dfo-infra sets every row except the App pair, along with the `dev`
Environment itself (branch policy, reviewers, wait timer). Run
`just ENV=dfo-dev handoff dcp` from the dfo-infra repo. One script is the
only writer of the environment's security-relevant settings.
`build-and-pin.yml` stops at its first step and names every one of these
that is unset. `DFO_APIS_BASE_URL` is the dfo-apis origin that
`next.config.mjs` bakes into the `/api/search` and `/api/datasets`
rewrites, so each environment names its own.

### dfo-bot GitHub App

`DEPLOY_APP_ID` and `DEPLOY_APP_PRIVATE_KEY` identify `dfo-bot`, a
GitHub App this repo installed and owns (app id `4423611`, installed on
`ONEcampaign/dfo-infra` and `ONEcampaign/dfo-dcp`, permissions
`contents:write`, `pull_requests:write`, `metadata:read`). It mints the
token `deploy-dev.yml` uses to push `deploy/dcp-dev` and open the pin PR
in dfo-infra, since the pin PR must be authored by something other than
`GITHUB_TOKEN` for dfo-infra's required checks to fire on it.

Install the two secrets on the `dev` Environment:

```
gh secret set DEPLOY_APP_ID --env dev --repo ONEcampaign/dfo-dcp --body 4423611
gh secret set DEPLOY_APP_PRIVATE_KEY --env dev --repo ONEcampaign/dfo-dcp < path/to/dfo-bot.private-key.pem
```

To rotate the private key: generate a new one from the App's settings
page, run the `DEPLOY_APP_PRIVATE_KEY` command above with the new PEM,
confirm the next deploy run mints a token successfully, then delete the
old key from the App's settings.

### Production

`production` has the same names, with `just ENV=dfo-prod handoff dcp`
setting the dfo-infra rows. It holds `RELEASE_APP_CLIENT_ID` (variable)
and `RELEASE_APP_PRIVATE_KEY` (secret) in place of the `dfo-bot` pair.
They identify `dfo-release`, the GitHub App installed on the
DevelopmentFinanceObservatory repos, with `contents:write`,
`pull_requests:write`, and `metadata:read` on `infra`. `deploy-prod.yml`
mints a token from it, creates the pin commit through GitHub's REST git
database API, moves `deploy/dcp-prod` to that commit, and opens the pin PR.
GitHub signs a commit an App creates through the API, and infra's
`sync-guard` admits only a signed pin commit by `dfo-release[bot]` whose
one parent is `main`'s head. The reusable workflow's job declares the
environment, so it reads the environment-level values itself, and each tier
reads only its own App.

Run `just ENV=dfo-prod setup-github-apps` from the dfo-infra repo to set
the `dfo-release` pair on `production`. That script,
`scripts/setup-github-apps.sh`, is the one writer of the reader and release
App credentials. It leaves the `dfo-bot` pair above alone.

## Prerequisites (dfo-infra)

- A Workload Identity Federation pool and provider trusting this repo's
  GitHub Actions OIDC issuer (no JSON service account keys).
- The `dfo-dcp-deployer` service account, impersonable through that
  provider, with `roles/artifactregistry.writer` on both the
  `datacommons` and `dfo-dcp-build-cache` repos below, and no Cloud Run
  role. This workflow never touches the Cloud Run service directly, only
  Artifact Registry.
- `infra/dfo-dev/dcp/image.auto.tfvars`, containing only the
  `datacommons_services_image` assignment plus the header comment this
  workflow's `sed` step preserves. The validator on the dfo-infra side
  accepts only a digest pin (`...dfo-services-image@sha256:<digest>`),
  never a tag.
- `dfo-bot` (see above) given write access to push branches and open
  pull requests in dfo-infra, and branch protection on `deploy/dcp-dev`
  (if any) that allows force-pushes from it.
- `allow_auto_merge` enabled, so an approved pin PR merges on its own.
- The `datacommons` Artifact Registry repo (already created in the dev
  project), for the image itself.
- The `dfo-dcp-build-cache` Artifact Registry repo, for BuildKit's
  registry cache. Separate from `datacommons` for the same reason the
  image is pinned by digest: `dfo-ai-deployer` and `dfo-apis-deployer`
  also hold writer there, and a shared cache repo would let either
  overwrite dcp's buildcache tag. `dfo-dcp-deployer` is the only writer
  on this repo.

## Branch protection on `dev`

Both `checks.yml` jobs are required status checks on this repo's `dev`
branch: PRs required, contexts `checks / prototypes` and
`checks / api_server`, zero required approvals. Renaming a job in
checks.yml changes its context string and silently stops it from
reporting, which blocks every PR with no visible error -- update this
list in the same PR as any job rename.

## Repo-side prerequisites

- The vars/secrets table above, populated on the `dev` Environment.
- A `staging` deploy path and GitHub Environment, once dfo-infra
  provisions a staging project. CONTRIBUTING-DFO.md's branch model
  already reserves `staging` between `dev` and `master`.
- Production deploys run through `deploy-prod.yml`. `just
  DEPLOY_ENV=prod deploy` is the break-glass path and needs
  `DOCKER_REGISTRY` and `DFO_APIS_BASE_URL` set to prod's values.
