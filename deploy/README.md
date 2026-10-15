# Deploy (ONE/DFO)

`deploy-dev.yml` builds and pushes the dcp image, then opens a pull
request into the `dev` branch of
[DevelopmentFinanceObservatory/infra](https://github.com/DevelopmentFinanceObservatory/infra)
that moves the `dev` image pin (`infra/dfo-dev/dcp/image.auto.tfvars`). It
runs on every push to `dev`, and the PR merges itself once infra `dev`'s
required checks pass. `deploy-prod.yml` does the same on every push to
`main`, into infra's `main` and `infra/dfo-prod/dcp/image.auto.tfvars`,
and a `release` team member approves and merges that PR. Merging a pin PR
triggers infra's own apply-on-merge workflow, which performs the actual
deploy through `terraform apply`. Both callers share
`build-and-pin.yml`, which takes the infra base branch as its
`infra-base` input.

apis and ai instead deploy with a plain `gcloud run services
update --image=...`, because infra's Terraform for those services
carries `lifecycle.ignore_changes` on the image. dcp's Cloud Run service
is created inside a pinned upstream Terraform module (datacommons's own
module, vendored into infra's `dcp` stack) that exposes no
`ignore_changes` seam for the image, so a direct `gcloud run services
update` would be reverted by infra's next `terraform apply`. This
repo builds and pushes the image and proposes the pin. infra owns the
service and performs the deploy.

This file documents that workflow only. It is unrelated to the other
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
what `deploy-dev.yml` pins in infra: Artifact Registry IAM
has no granularity below the repository, and `dfo-ai-deployer` and
`dfo-apis-deployer` both hold writer on this same `datacommons` repo, so
either could overwrite a tag. A digest pin makes that a no-op, since the
digest names the bytes directly. infra's validator accepts only a digest
pin in this exact shape.

This is the image the GitHub Actions workflow builds and pushes. `just
deploy` is a separate break-glass path. It builds and pushes an
immutable `dfo-<tier>-<sha>` tag by hand, resolves the digest Artifact
Registry assigned it, and prints both, for when CI is down or you need
to test an unmerged commit. It leaves infra's pin alone.

## GitHub vars and secrets

`deploy-dev.yml` reads these from the `dev` GitHub Environment, which
exists on this repo with a deployment branch policy restricted to `dev`.
`deploy-prod.yml` reads the same names from the `production` Environment,
with the App pair listed under "Production".

| Name                  | Kind   | Example value                                                                               | Who provides it                           |
| --------------------- | ------ | ------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `WIF_PROVIDER`        | secret | `projects/123456789/locations/global/workloadIdentityPools/github/providers/github-actions` | infra, via `just ENV=dfo-dev handoff dcp` |
| `WIF_SA`              | secret | `dfo-dcp-deployer@dev-fin-observatory.iam.gserviceaccount.com`                              | infra, via `just ENV=dfo-dev handoff dcp` |
| `PIN_APP_CLIENT_ID`   | var    | `Iv23li...`                                                                                 | infra, via `just setup-github-apps`       |
| `PIN_APP_PRIVATE_KEY` | secret | _(PEM private key)_                                                                         | infra, via `just setup-github-apps`       |
| `REGION`              | var    | `northamerica-northeast1`                                                                   | infra, via `just ENV=dfo-dev handoff dcp` |
| `PROJECT_ID`          | var    | `dev-fin-observatory`                                                                       | infra, via `just ENV=dfo-dev handoff dcp` |
| `AR_REPO`             | var    | `datacommons`                                                                               | infra, via `just ENV=dfo-dev handoff dcp` |
| `AR_CACHE_REPO`       | var    | `dfo-dcp-build-cache`                                                                       | infra, via `just ENV=dfo-dev handoff dcp` |
| `DFO_APIS_BASE_URL`   | var    | `https://dfo-dev-apis-zms5lj4zhq-nn.a.run.app`                                              | infra, via `just ENV=dfo-dev handoff dcp` |

infra sets every row except the App pair, along with the `dev`
Environment itself (branch policy, reviewers, wait timer). Run
`just ENV=dfo-dev handoff dcp` from the infra repo. One script is the
only writer of the environment's security-relevant settings.
`build-and-pin.yml` stops at its first step and names every one of these
that is unset. `DFO_APIS_BASE_URL` is the dfo-apis origin that
`next.config.mjs` bakes into the `/api/search` and `/api/datasets`
rewrites, so each environment names its own.

### dfo-pin GitHub App

`PIN_APP_CLIENT_ID` and `PIN_APP_PRIVATE_KEY` identify `dfo-pin`, a
GitHub App installed on `DevelopmentFinanceObservatory/infra` only, with
`contents:write`, `pull_requests:write`, and `metadata:read`. Its key lives
only in this repo's `dev` Environment. `deploy-dev.yml` mints a token from
it, creates the pin commit through GitHub's REST git database API, moves
`deploy/dcp-dev` to that commit, opens the pin PR into infra `dev`, and
arms auto-merge. The PR must come from an App, since GitHub runs no
workflows for a PR or merge made with `GITHUB_TOKEN`, so infra's required
checks and apply-on-merge would never fire.

### Production

`production` has the same names, with `just ENV=dfo-prod handoff dcp`
setting the infra rows. It holds `RELEASE_APP_CLIENT_ID` (variable)
and `RELEASE_APP_PRIVATE_KEY` (secret) in place of the `dfo-pin` pair.
They identify `dfo-release`, with `contents:write`, `pull_requests:write`,
and `metadata:read` on infra. `deploy-prod.yml` pins through the same
steps into infra `main` and leaves auto-merge off. The reusable workflow's
job declares the environment, so it reads the environment-level values
itself, and each tier reads only its own App.

Run `just setup-github-apps` from the infra repo to set either pair.
That script, `scripts/setup-github-apps.sh`, is the one writer of the App
credentials.

## Prerequisites (infra)

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
  accepts only a digest pin (`...dfo-services-image@sha256:<digest>`).
- `dfo-pin` (see above) installed on infra, and no ruleset on
  `deploy/dcp-dev` that blocks its force-moves.
- `allow_auto_merge` enabled, and infra `dev`'s ruleset requiring checks
  and no approval, so a dev pin PR merges on its own.
- The `datacommons` Artifact Registry repo (already created in the dev
  project), for the image itself.
- The `dfo-dcp-build-cache` Artifact Registry repo, for BuildKit's
  registry cache. Separate from `datacommons` for the same reason the
  image is pinned by digest: `dfo-ai-deployer` and `dfo-apis-deployer`
  also hold writer there, and a shared cache repo would let either
  overwrite dcp's buildcache tag. `dfo-dcp-deployer` is the only writer
  on this repo.

## Branch protection on `dev`

The `dev` ruleset requires a pull request with zero approvals and the
`checks / prototypes` status check. Renaming the job in checks.yml changes
its context string and stops it reporting, which blocks every PR with no
visible error. Update the ruleset in the same PR as any job rename.

## Repo-side prerequisites

- The vars/secrets table above, populated on the `dev` Environment.
- Production deploys run through `deploy-prod.yml`. `just
DEPLOY_ENV=prod deploy` is the break-glass path and needs
  `DOCKER_REGISTRY` and `DFO_APIS_BASE_URL` set to prod's values.
