# Maintainer notes

How the ONE Data team develops, syncs and releases this fork of [datacommonsorg/website](https://github.com/datacommonsorg/website). Outside contributors can start with [CONTRIBUTING.md](../.github/CONTRIBUTING.md) instead.

## What this repo is

The Development Finance Observatory's Data Commons instance: the website and the mixer (the graph server) under it. The Search API and Datasets API are built in [apis](https://github.com/DevelopmentFinanceObservatory/apis) and read from the graph this repo serves.

Two kinds of code live here.

- Upstream code is everything outside `custom_dc/`. It tracks datacommonsorg/website and the `mixer` and `import` submodules. Changes arrive by upstream sync and are not written here.
- DFO code is everything under `custom_dc/dfo/`. `custom_dc/dfo/prototypes` is the Next.js frontend. Upstream never touches these paths, so a sync cannot conflict with work there.

Three upstream files carry small DFO hooks: `build/cdc_services/Dockerfile`, `build/cdc_services/run.sh` and `build/cdc_services/nginx.conf`. `.dfo-overridden-files` maps each to its DFO target under `custom_dc/dfo/`, and `just check-overrides` warns when upstream changes one.

The repo builds one container image. The `infra` repo deploys it to Cloud Run.

## Files that guard upstream sync

| File                    | Read by                | Effect                                                                                                 |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `.gitattributes`        | `git merge`            | `README.md merge=ours` keeps DFO's README. Register the driver once with `just setup`.                 |
| `.dfo-protected-paths`  | `just sync-resolve`    | A conflict in a listed path waits for manual review. Every other conflict resolves to upstream's side. |
| `.dfo-overridden-files` | `just check-overrides` | Lists upstream files that carry DFO hooks, so changes to them are flagged after a sync.                |

`.github/CONTRIBUTING.md` is the contributor guide GitHub shows. Upstream's root `CONTRIBUTING.md` (Google's CLA and conduct guidance) stays as upstream ships it, and the DFO guide sits at a path upstream does not use. `.dfo-protected-paths` lists the DFO guide, `README.md` and this page so a future upstream file at one of those paths cannot be resolved to upstream's version unnoticed.

## Branch model

Two branches, each mapped to one environment. Work flows up from `dev` to `main`.

- `dev` is the default branch. Feature branches merge here, and upstream syncs land here first. It deploys to `dfo-dev`.
- `main` is production. A reviewed pull request from `dev` is the only way it moves. Every commit on `main` is deployable.

```text
feat/*  ──►  dev  ──►  main
         dfo-dev     dfo-prod
```

`customdc_stable` mirrors upstream's stable release channel and is the reference point for `just sync`.

## Day-to-day flow

1. Branch off `dev` and name it `feat/<feature>`.
2. Build the change, run the tests, and open a pull request into `dev`. `ci.yml` runs typecheck and tests on `custom_dc/dfo/prototypes`.
3. On merge, `deploy-dev.yml` builds the image, pushes it to Artifact Registry, and opens a pull request into infra's `dev` branch that moves the `dfo-dev` image pin. The pull request merges itself once infra's checks pass, and infra's apply-on-merge does the deploy. Validate against the live graph once it lands.

## Taking upstream changes

Upstream sync is a step on `dev`.

```bash
git checkout dev
git fetch upstream
just sync                 # shows what changed since the last sync
git merge upstream/master
git submodule update --init --recursive
```

`just sync-auto`, `just sync-theirs` and `just sync-resolve` automate the merge and its conflicts. Merging upstream's website also moves the `mixer` and `import` submodule pointers, because upstream pins them. The website and submodules must move together.

### Matching a Data Commons Platform release

`infra` pins a Data Commons Platform (DCP) version (`1.1.x`) for the Terraform stack, and the image this repo builds has to match it. A website tag does not say which mixer that release runs. Google builds the release image from a website tag plus a mixer commit that runs ahead of what the tag pins. DCP 1.1.2 was built from website `v3.5.7` with mixer `79627f8`, while `v3.5.7` itself pins mixer `051d8ff`.

That mapping is recorded only in the published image, as build args:

```bash
CFG=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  https://gcr.io/v2/datcom-ci/datacommons-services/manifests/1.1.2 | jq -r .config.digest)
curl -sL https://gcr.io/v2/datcom-ci/datacommons-services/blobs/$CFG \
  | jq '.config.Env[] | select(contains("HASH"))'
```

To move to a new DCP release, read `WEBSITE_HASH` and `MIXER_HASH` off that release's image, merge the website commit, then set the `mixer` pointer to `MIXER_HASH`. Using the mixer that the website tag pins builds a pairing Google never tested against that release's Terraform stack.

`codeql-analysis.yml`, `dependabot-approval.yml` and `submodule-update.yml` under `.github/workflows/` are deleted in this fork. All three guard their jobs on `github.repository == 'datacommonsorg/website'`, so they never run here. Upstream re-adds them on every sync that touches them. Keep them deleted when resolving the conflict.

## Releasing to production

Production takes validated snapshots, so a raw upstream bump cannot reach it.

1. Confirm the `dev` commit you want is deployed and validated on `dfo-dev`.
2. Open a pull request from `dev` into `main`. A `release` team member approves and merges it.
3. Tag the merge commit `prod-YYYY-MM-DD`.
4. `deploy-prod.yml` builds the image and opens the pin pull request into infra's `main`. A `release` team member approves and merges that too.

## Building and deploying

`deploy-dev.yml` and `deploy-prod.yml` build the image and open the pin pull requests described above. This repo proposes the pin and infra owns the Cloud Run service. [deploy/README.md](../deploy/README.md) documents the workflows, the GitHub Environment variables and secrets, the GitHub Apps, the infra prerequisites, and the branch ruleset on `dev`.

```bash
just deploy                    # dev image:  dfo-dev-<sha>
just DEPLOY_ENV=prod deploy    # prod image: dfo-prod-<sha>
```

`deploy` is a break-glass path for when CI is down or an unmerged commit needs testing. It builds and pushes an immutable `dfo-<tier>-<sha>` image by hand and prints the digest. It leaves infra's pin alone, so making the result live means editing `infra/dfo-dev/dcp/image.auto.tfvars` and opening a pull request. A prod cut refuses a dirty tree, so the image is always reproducible from a committed sha.

## Local environment

`just env` creates `custom_dc/dfo/env.list`. It reads `DC_API_KEY` and `MAPS_API_KEY` from Secret Manager in the `dev-fin-observatory` project (secrets matching `dfo-dev-dc-api-key` and `dfo-dev-dc-google-maps-api-key`), and `GEMINI_API_KEY` from `dfo-dev-gemini-api-key` when it exists. This needs `gcloud auth login` and the Secret Accessor role on those secrets. A key that cannot be fetched is prompted for. The resulting `env.list` is gitignored. [custom_dc/dfo/README.md](../custom_dc/dfo/README.md) covers the container port map, hot-reload mode and the search transport.

## Conventions

- Commits follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `chore:`, `docs:` and `ci:`.
- Feature branches are short-lived. Delete them after merge.
