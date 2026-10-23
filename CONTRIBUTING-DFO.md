# Contributing (DFO fork)

How development works in the DFO's fork of [datacommonsorg/website](https://github.com/datacommonsorg/website). Read this before opening a branch.

## What this repo is

The DFO's Data Commons instance, meaning the mixer and the graph-serving layer under it. The Search API and Datasets API are built in [apis](https://github.com/DevelopmentFinanceObservatory/apis) and read from the graph this repo serves.

Two kinds of code live here, and they behave differently.

- **Upstream code.** Everything outside `custom_dc/` tracks datacommonsorg/website and the `mixer` and `import` submodules. We take changes from upstream; we do not write them here.
- **ONE Data code.** Everything under `custom_dc/` is ours (for the DFO). `custom_dc/dfo/prototypes` is the frontend. Upstream never touches these paths, so an upstream sync cannot conflict with work there.

The repo builds one container image. A sibling repo, `infra`, deploys it to Cloud Run. This repo builds and pushes an image, and `infra` runs it.

## Branch model

Two branches, each mapped to one environment. Work flows up from `dev` to `main`.

- **`dev`.** Active development, and the default branch. Feature branches merge here, and upstream syncs land here first. Deploys to `dfo-dev`.
- **`main`.** Production. Moved only by a reviewed PR from `dev`. Every commit on `main` is deployable.

```
feat/*  ──►  dev  ──►  main
         dfo-dev     dfo-prod
```

## Where your work goes

The loop is short.

1. Branch off `dev`. Name it `feat/<feature>`.

2. Build the change, run the tests, open a PR into `dev`. `ci.yml` runs
   typecheck and tests on `custom_dc/dfo/prototypes`.

3. On merge, `deploy-dev.yml` builds the image, pushes it to Artifact
   Registry, and opens a PR into infra's `dev` branch that moves the
   `dfo-dev` image pin. The PR merges itself once infra's checks pass, and
   infra's apply-on-merge does the deploy. Validate against the live graph
   once it lands.

## Taking upstream changes

`dev` tracks Data Commons Platform (DCP) releases. `infra` pins a DCP version as `dcp_version` in `infra/stacks/dcp/variables.tf`, and `dev` carries the website and mixer that release was built from. A sync is a merge of that website commit into `dev`, so `dev` shares history with datacommonsorg/website.

```sh
git checkout dev
just sync 1.1.6           # merge the website commit DCP 1.1.6 was built from
```

`just sync` stops on conflicts. `just sync-resolve` takes upstream's side for every path outside `.dfo-protected-paths` and leaves the protected ones for you. After resolving those, `git add` them and run `just sync-finish`. `just sync-abort` drops the merge. Once committed, the recipe checks out the submodules and runs `just check-overrides`, which lists the seam files in `.dfo-overridden-files` that upstream changed across the sync.

### Matching a Data Commons Platform release

The website and mixer move as a pair, and the pairing comes from the release image. Each image `gcr.io/datcom-ci/datacommons-services:<version>` records its source commits as the `WEBSITE_HASH` and `MIXER_HASH` build args. A website tag pins one mixer, and Google can build a release with a newer one. DCP 1.1.2 was built from website `v3.5.7` with mixer `79627f8`, while `v3.5.7` pins mixer `051d8ff`.

`just dcp-pair <version>` prints the pairing:

```sh
$ just dcp-pair 1.1.6
website=9852134
mixer=8118587
```

It reads the image config from the registry, the same as:

```sh
CFG=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  https://gcr.io/v2/datcom-ci/datacommons-services/manifests/1.1.6 | jq -r .config.digest)
curl -sL https://gcr.io/v2/datcom-ci/datacommons-services/blobs/$CFG \
  | jq '.config.Env[] | select(contains("HASH"))'
```

`just sync` merges `WEBSITE_HASH`, sets the `mixer` pointer to `MIXER_HASH`, and sets the `import` pointer to the one the website commit pins. It fails if the image or either build arg is missing. Taking the mixer the website tag carries builds a pairing Google never tested against that release's Terraform stack.

`.github/workflows/` is DFO-owned. A workflow file upstream adds there would run on the fork, so a sync takes nothing from upstream under that directory. `just sync` and `just sync-finish` reset it to the pre-merge version and list every file upstream added, changed, or deleted there. Port one by hand in its own PR if the fork needs it. Upstream's `codeql-analysis.yml`, `dependabot-approval.yml`, and `submodule-update.yml` stay deleted this way.

## Releasing to production

Production takes validated snapshots, not a channel. It is never exposed to a raw upstream bump.

1. Confirm the `dev` commit you want is deployed and validated on `dfo-dev`.
2. Open a PR from `dev` into `main`. A `release` team member approves and merges it.
3. Tag the merge commit `prod-YYYY-MM-DD`.
4. `deploy-prod.yml` builds the image and opens the pin PR into infra's `main` (below).

## Building and deploying

Pushing to `dev` builds and deploys automatically. `deploy-dev.yml` opens
the PR into infra's `dev` branch that moves the `dfo-dev` image pin at
`infra/dfo-dev/dcp/image.auto.tfvars`, and the PR merges itself once
infra's required checks pass. Pushing to `main` runs `deploy-prod.yml`,
which opens the PR into infra's `main` that moves
`infra/dfo-prod/dcp/image.auto.tfvars`. A `release` team member approves
and merges that PR. This repo proposes the pin. infra owns the Cloud Run
service and applies it.

```sh
just deploy                    # dev image:  dfo-dev-<sha>
just DEPLOY_ENV=prod deploy    # prod image: dfo-prod-<sha>
```

`deploy` is a break-glass path for when CI is down or you need to test an
unmerged commit. It builds and pushes an immutable `dfo-<tier>-<sha>` image
by hand. It leaves infra's pin alone, so landing the result as the
live image still means editing `infra/dfo-dev/dcp/image.auto.tfvars` and
opening a PR yourself. A prod cut refuses a dirty tree, so the image is
always reproducible from a committed sha.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `chore:`, and so on.
- **PRs target `dev`.** Only the release step writes to `main`.
- **PRs into `dev` land as merge commits.** The `dev` ruleset allows only merges. A sync commit's second parent is the upstream website commit, and that parent is what keeps the fork's history shared with datacommonsorg/website. A squash or rebase drops it, and the next sync merges from an older base and replays upstream changes the fork already has as conflicts.
- **Delete merged branches.** Feature branches are short-lived.
- **Keep internal notes out of the repo.** Design docs, plans, and audits stay local. This guide and real reference docs are the exception.
