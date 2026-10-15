# Contributing

Issues and pull requests are welcome. The ONE Data team maintains this repo. For a large change, open an issue to discuss it before you write it.

Everyone taking part follows the [code of conduct](https://github.com/DevelopmentFinanceObservatory/.github/blob/main/CODE_OF_CONDUCT.md). Report security issues through the "Report a vulnerability" button under the Security tab, and use the [support page](https://github.com/DevelopmentFinanceObservatory/.github/blob/main/SUPPORT.md) for questions.

## Where a change belongs

This repo is a fork of [datacommonsorg/website](https://github.com/datacommonsorg/website) and takes changes from it by merge.

- Changes to DFO code go here: `custom_dc/dfo/`, the `justfile`, and `.github/workflows/`.
- Changes to code anywhere else are overwritten on the next upstream sync. Send them to [datacommonsorg/website](https://github.com/datacommonsorg/website). Google's guidance for that project, including its Contributor License Agreement, is in the root [CONTRIBUTING.md](../CONTRIBUTING.md).

Contributions here are licensed under Apache-2.0, as section 5 of the [LICENSE](../LICENSE) provides.

## Set up and check your change

The frontend in `custom_dc/dfo/prototypes` builds and tests without ONE's Google Cloud access. It needs Node 20.19 or later.

```bash
cd custom_dc/dfo/prototypes
npm ci
npm run typecheck
npm run test
```

CI runs these same two checks on every pull request. Running the full stack with `just run-local` or `just dev` needs access to ONE's cloud project and is not required for a pull request.

## Branches and commits

- Branch off `dev` and open the pull request into `dev`. `main` is production and moves only by a release from `dev`.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`, `fix:`, `docs:`, `ci:`, `chore:`.

## What a pull request needs

- Passing CI (`checks / prototypes`).
- Tests for changed behaviour, next to the code they cover.
- Updated documentation where a command, path or behaviour changed.

Maintainer procedures, such as upstream sync and releases, are in [docs/development.md](../docs/development.md).
