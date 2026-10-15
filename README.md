# DFO Data Commons platform

A fork of [Data Commons](https://github.com/datacommonsorg/website) (`datacommonsorg/website`) that runs the graph behind the [Development Finance Observatory](https://github.com/DevelopmentFinanceObservatory) (DFO). It adds a Next.js frontend and the build and deploy wiring for one container image on Cloud Run. The DFO is an initiative of [ONE Data](https://data.one.org), and the [organisation profile](https://github.com/DevelopmentFinanceObservatory) maps its other repositories.

This repository is under active development. Interfaces, schemas, and data may change without notice.

## What this fork changes

- `custom_dc/dfo/` holds DFO code: the Next.js frontend in `custom_dc/dfo/prototypes`, served at `/prototype`, plus the nginx and startup hooks that bake it into the image.
- `build/cdc_services/Dockerfile`, `run.sh` and `nginx.conf` carry small hooks that call that code.
- `justfile` and `.github/workflows/` hold DFO's build, deploy and CI recipes.
- Everything else tracks upstream, including the `mixer` and `import` submodules. Upstream changes are merged in; DFO changes are not sent back.

Upstream's copyright and attribution notices remain in the source files. Upstream's documentation is at [docs.datacommons.org](https://docs.datacommons.org) and in [docs/developer_guide.md](docs/developer_guide.md).

## Getting started

Running the full stack needs access to ONE's Google Cloud project (`dev-fin-observatory`) for API keys and credentials, so `just setup`, `just run-local` and `just dev` work for the ONE team only. Without that access you can read the code and typecheck and test the frontend:

```bash
cd custom_dc/dfo/prototypes
npm ci
npm run typecheck
npm run test
```

This needs Node 20.19 or later. `just` on its own lists every recipe.

## Documentation

- [custom_dc/dfo/README.md](custom_dc/dfo/README.md) covers the frontend, its container port map and local runs.
- [docs/development.md](docs/development.md) covers branches, upstream sync and releases for maintainers.
- [deploy/README.md](deploy/README.md) covers the deploy workflows.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Licence

Apache-2.0. See [LICENSE](LICENSE).
