# Contributing (DFO fork)

How development works in the DFO's fork of [datacommonsorg/website](https://github.com/datacommonsorg/website). Read this before opening a branch.

## What this repo is

The DFO's Data Commons instance, meaning the mixer and the graph-serving layer under it. The Search API and Datasets API are built in [dfo-apis](https://github.com/ONEcampaign/dfo-apis) and read from the graph this repo serves.

Two kinds of code live here, and they behave differently.

- **Upstream code.** Everything outside `custom_dc/` tracks datacommonsorg/website and the `mixer` and `import` submodules. We take changes from upstream; we do not write them here.
- **ONE Data code.** Everything under `custom_dc/` is ours (for the DFO). `custom_dc/dfo/prototypes` is the frontend, and `custom_dc/api_server` holds a legacy copy of the Search API that stays until its removal PR lands. Upstream never touches these paths, so an upstream sync cannot conflict with work there.

The repo builds one container image. A sibling repo, `dfo-infra`, deploys it to Cloud Run. This repo builds and pushes an image; `dfo-infra` runs it.

## Branch model

Three branches, each mapped to one environment. Work flows up, never down.

- **`dev`.** Active development, and the default branch. Feature branches merge here, and upstream syncs land here first. Deploys to `dfo-dev`.
- **`master`.** Production. Protected, tagged, and only ever moved by promoting a validated `dev` commit. Every commit on `master` is deployable.
- **`staging`.** Not built yet. It slots between `dev` and `master` once the staging environment exists in `dfo-infra`.

```
feat/*  ──►  dev  ──►  (staging)  ──►  master
         dfo-dev                       dfo-prod
```

`customdc_stable` is not a tier. It mirrors upstream's stable release channel and serves as the reference point for `just sync`.

## Where your work goes

The loop is short.

1. Branch off `dev`. Name it `feat/<feature>`.

2. Build the change, run the tests, open a PR into `dev`. `ci.yml` runs
   typecheck and tests on the DFO-owned code paths (`custom_dc/dfo/prototypes`
   and `custom_dc/api_server`).

3. On merge, `deploy-dev.yml` builds the image, pushes it to Artifact
   Registry, and opens a PR in `dfo-infra` that moves the `dfo-dev` image
   pin. Merging that PR triggers `dfo-infra`'s apply-on-merge, the actual
   deploy. Validate against the live graph once it lands.

## Taking upstream changes

Upstream sync is a step on `dev`, not a separate long-lived branch.

```sh
git checkout dev
git fetch upstream
just sync                 # shows what changed since the last sync
git merge upstream/master
git submodule update --init --recursive
```

Merging upstream's website also moves the `mixer` and `import` submodule pointers, because upstream pins them. **Website and submodules must move together.**

### Matching a Data Commons Platform release

`dfo-infra` pins a DCP version (`1.1.x`) for the Terraform stack, and the image this repo builds has to match it. A website tag alone will not tell you which mixer that release runs. Google builds the release image from a website tag plus a mixer commit that runs ahead of what the tag pins. DCP 1.1.2 was built from website `v3.5.7` with mixer `79627f8`, while `v3.5.7` itself pins mixer `051d8ff`.

That mapping exists only inside the published image, as build args:

```sh
CFG=$(curl -s -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  https://gcr.io/v2/datcom-ci/datacommons-services/manifests/1.1.2 | jq -r .config.digest)
curl -sL https://gcr.io/v2/datcom-ci/datacommons-services/blobs/$CFG \
  | jq '.config.Env[] | select(contains("HASH"))'
```

To move to a new DCP release, read `WEBSITE_HASH` and `MIXER_HASH` off that release's image, merge the website commit, then set the `mixer` pointer to `MIXER_HASH`. Taking the mixer the website tag carries instead builds a pairing Google never tested against that release's Terraform stack.

`.github/workflows/codeql-analysis.yml`, `dependabot-approval.yml`, and `submodule-update.yml` are deleted in this fork. All three guard their jobs on `github.repository == 'datacommonsorg/website'`, so they never run here. Upstream re-adds them on every sync that touches them. Keep them deleted rather than resolving the conflict toward upstream's version.

## Releasing to production

Production takes validated snapshots, not a channel. It is never exposed to a raw upstream bump.

1. Confirm the `dev` commit you want is deployed and validated on `dfo-dev`.
2. Fast-forward `master` to that commit. Because `dev` contains everything on `master`, this is always a clean fast-forward.
3. Tag it `prod-YYYY-MM-DD`.
4. Cut and deploy the image (below).

## Building and deploying

Pushing to `dev` builds and deploys automatically. `deploy-dev.yml` opens
the PR in `dfo-infra` that moves the `dfo-dev` image pin at
`infra/dfo-dev/dcp/image.auto.tfvars`. This repo proposes the pin.
`dfo-infra` owns the Cloud Run service and applies it.

```sh
just deploy                    # dev image:  dfo-dev-<sha>
just DEPLOY_ENV=prod deploy    # prod image: dfo-prod-<sha>
```

`deploy` is a break-glass path for when CI is down or you need to test an
unmerged commit. It builds and pushes an immutable `dfo-<tier>-<sha>` image
by hand. It does not touch `dfo-infra`'s pin, so landing the result as the
live image still means editing `infra/dfo-dev/dcp/image.auto.tfvars` and
opening a PR yourself. A prod cut refuses a dirty tree, so the image is
always reproducible from a committed sha. Production has no automated
deploy path, so `deploy` is the only way to cut a prod image.

## Conventions

- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `chore:`, and so on.
- **PRs target `dev`.** Only the release step writes to `master`.
- **Delete merged branches.** Feature branches are short-lived.
- **Keep internal notes out of the repo.** Design docs, plans, and audits stay local. This guide and real reference docs are the exception.
