# DFO Data Commons Platform

ONE Data's fork of [Data Commons](https://github.com/datacommonsorg/website). It runs as a custom Data Commons instance backed by Spanner, and serves the knowledge graph that the DFO's APIs and front ends read from.

New here? Read [CONTRIBUTING-DFO.md](./CONTRIBUTING-DFO.md) before opening a branch. It covers the branch model, how upstream syncs work, and how to release.

## Layout

- **`custom_dc/`** is ONE Data's DFO code. `custom_dc/dfo/prototypes` is the frontend, and `custom_dc/api_server` holds a legacy copy of the Search API that stays until its removal PR lands. The Search API and Datasets API are built in [apis](https://github.com/DevelopmentFinanceObservatory/apis). Upstream never touches these paths.
- **Everything else** tracks upstream `datacommonsorg/website`, with the graph server (`mixer`) and ingestion (`import`) as submodules.

## Quickstart

```sh
just setup       # one-time: env file, Docker auth, submodules, git config
just dev         # hot-reload dev loop (DC services in Docker, frontend native)
just run-local   # run the full container locally
```

`just` on its own lists every target.

## Deploying

```sh
just deploy                    # build and push a dfo-dev-<sha> image
just DEPLOY_ENV=prod deploy    # build and push a dfo-prod-<sha> image
```

`deploy` prints the command to run from the sibling `infra` repo, which applies it to Cloud Run. See [CONTRIBUTING-DFO.md](./CONTRIBUTING-DFO.md) for the full release flow.

## Relationship to upstream

This is a long-lived fork. We take changes from `datacommonsorg/website` by merging `upstream/master` into `dev`; we do not send changes back. This README replaces upstream's, and a `merge=ours` rule in `.gitattributes` keeps it ours across syncs. Register the rule once with `just setup`, or directly with `git config merge.ours.driver true`.

For the base Data Commons platform, see the [upstream docs](https://github.com/datacommonsorg/website) and [developer guide](docs/developer_guide.md).

## License

TBD
