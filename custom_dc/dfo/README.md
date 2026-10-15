# DFO prototypes frontend

A Next.js 16 server-component app (`custom_dc/dfo/prototypes/`) baked into the Data Commons services container image and served at `/prototype`. The DC website stays at `/`. It hosts prototypes that exercise the search backend provided by `dfo-apis`:

- **`/prototype/search`** — the production-shaped Sentence Search surface: editable sentence, coverage rail, and download.

**Why baked in, not a separate Cloud Run service:** no additional service to manage, no cross-service latency, and the DC mixer is reachable over `localhost` so there is no CORS problem and secrets never leave the server.

---

## Architecture

### Container port map

```
Cloud Run :8080
    └── nginx
         ├── /              → website        :7070
         ├── /core/api/     → mixer          :8081
         ├── /mcp           → MCP server     :8082
         ├── /prototype     → Next.js        :3000
         ├── /api/search/   → Next.js        :3000 (rewritten to the website, which proxies to dfo-apis)
         └── /api/datasets  → Next.js        :3000 (rewritten to the website, which proxies to dfo-apis)
```

### How the bake-in works

1. A `dfo-dcp` Docker build stage (`FROM node:20`) runs `npm ci` and `next build` in `custom_dc/dfo/prototypes/`, producing a standalone bundle at `.next/standalone/`.
2. Three `COPY --from=dfo-dcp` lines in the runner stage copy `standalone/`, `.next/static/`, and `public/` into `/workspace/custom_dc/dfo/prototypes/`.
3. `start.sh` is sourced by `run.sh` just before `wait -n`. It starts the standalone server (`node /workspace/custom_dc/dfo/prototypes/server.js`) under a self-restarting supervisor subshell.
4. `nginx-app.conf` is included by `nginx.conf` via glob (`include …/nginx-*.conf;`) and adds the `/prototype`, `/api/search/`, and `/api/datasets` location blocks and turns on gzip (level 1) for JSON, CSV, and SDMX CSV responses.

The search API backend is deployed independently in [apis](https://github.com/DevelopmentFinanceObservatory/apis).

### Seam philosophy

The three upstream files (`build/cdc_services/Dockerfile`, `run.sh`, `nginx.conf`) each carry DFO hooks that delegate to files under `custom_dc/dfo/`. All DFO logic lives in that directory. The hooks are:

| Upstream file | Hook                                                                     | Delegates to                                    |
| ------------- | ------------------------------------------------------------------------ | ----------------------------------------------- |
| `Dockerfile`  | Sentinel-bracketed `dfo-dcp` stage + COPY triplet                        | `custom_dc/dfo/prototypes/` (standalone bundle) |
| `run.sh`      | `[ -f .../custom_dc/dfo/start.sh ] && source .../custom_dc/dfo/start.sh` | `custom_dc/dfo/start.sh`                        |
| `nginx.conf`  | `include /workspace/custom_dc/*/nginx-*.conf;`                           | `custom_dc/dfo/nginx-app.conf`                  |

The hooks never change after they are written, so they rarely conflict on upstream sync. When upstream does touch one of these three files, `just check-overrides` flags it.

---

## Prerequisites

- **`just`** — task runner ([just.systems](https://just.systems))
- **Docker with buildx** — for building the image
- **`gcloud` authenticated** — `gcloud auth login` (for `just env`'s Secret Manager pull) and `gcloud auth application-default login` (ADC, mounted into the container at runtime)
- **Node 20** — only for `just typecheck` on the host; not needed for Docker-only workflows
- **`env.list`** — created by `just env` (see below)

---

## Run it locally

### 1. Create your env file

```
$ just env
Checking required environment variables...
  (DC/Maps keys are pulled from Secret Manager; falls back to prompting.)
  DC_API_KEY fetched from Secret Manager.
  MAPS_API_KEY fetched from Secret Manager.
  Output directory (absolute path): /path/to/output
custom_dc/dfo/env.list is ready. Run 'just run-local' to start.
```

`just env` pulls `DC_API_KEY` and `MAPS_API_KEY` from Secret Manager in the
`dev-fin-observatory` project (secrets matching `dfo-dev-dc-api-key` and
`dfo-dev-dc-google-maps-api-key`). This needs `gcloud auth login` and the Secret
Manager **Secret Accessor** role on those secrets — if a key can't be fetched,
the recipe prompts for it instead. The resulting `env.list` is gitignored; never
commit it.

Any value can be supplied as an environment variable to skip its prompt (and, for
the keys, to override Secret Manager) — so `just env` runs fully non-interactively
in CI:

```
$ OUTPUT_DIR=/data DC_API_KEY=… MAPS_API_KEY=… just env
```

`OUTPUT_DIR` is the only value with no Secret Manager fallback, so set it this way
(or accept the prompt) when running headless.

### 2. Build and run the baked image

```
$ just build-run
```

This builds the Docker image (running `npm ci` + `next build` inside) and starts the container. Expected log output includes:

```
Starting DFO Next.js app on :3000
```

Once running, open:

- `http://localhost:8080/` — the DC website
- `http://localhost:8080/prototype` — the prototypes index
- `http://localhost:8080/prototype/search` — the Sentence Search surface

> [!NOTE]
> `just run-local` runs the **baked image** — the Next.js bundle built into Docker. Use this to confirm the production path works. `just run` is an alias.

### 3. Hot-reload mode

```
$ just dev
```

Runs the DC services container in the background (nginx on `:8080`, mixer on `:8081`) and then starts host dev server against it: Next (`next dev` on `:3000`). `Ctrl-C` stops both. (The host is arm64 and the image amd64, so the dev server runs natively on the host, not inside the container.)

> [!NOTE]
> `next dev` runs on the host, so it needs `node_modules` present in `custom_dc/dfo/prototypes/`. `just dev` depends on `just typecheck`, which installs them on first run. If you start it another way, run `npm install` in `custom_dc/dfo/prototypes/` first — otherwise `next dev` can't find `next` and the DC site at `/` keeps working while `/prototype` does not.

> [!NOTE]
> `next.config.mjs` bakes the website origin into the `/api/search` and `/api/datasets` rewrites and fails without `DFO_SITE_ORIGIN`. The website proxies both paths to dfo-apis, so the prototype holds no apis credentials. `just build` passes the variable as a Docker build argument and `just dev` sets it for `next dev`, and both default to the dev website. A `DEPLOY_ENV=prod` build has no default and needs `DFO_SITE_ORIGIN`. Point them at a local dfo-apis engine, which serves the same two paths, with `DFO_SITE_ORIGIN=http://127.0.0.1:8083 just dev`. A bare `npm run dev` or `npm run build` needs the variable set in the shell.

### 4. Type-check before building

```
$ just typecheck
Running TypeScript type checker...
```

Installs `node_modules` on first run (via `npm ci --ignore-scripts`), then runs `tsc --noEmit`. The `build` recipe depends on this, so a type error stops the Docker build early.

---

## Transport: fixtures vs. the live Search API

The search prototype reads through a `SearchTransport` abstraction with two implementations:

- **`FixtureTransport`** (default) — replays canned fixture data. No network calls needed.
- **`HttpTransport`** — calls the live Search API at `/api/search/*` (same-origin; rewritten to the website, which proxies to `dfo-apis`).

Set in `env.list` / the environment:

```
NEXT_PUBLIC_USE_SEARCH_API=true
```

to switch to `HttpTransport`. `NEXT_PUBLIC_SEARCH_API_BASE` overrides the base URL only when targeting a remote search API origin directly (rare — same-origin `/api/search/*` is the normal path). Both are `NEXT_PUBLIC_*` vars: inlined at build time, no secrets, safe to expose to the browser.

---

## `/prototype` routing and basePath

Two settings must stay in sync. If you change one, change the other.

| File                                       | Setting                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `custom_dc/dfo/prototypes/next.config.mjs` | `basePath: '/prototype'`                                                                      |
| `custom_dc/dfo/nginx-app.conf`             | `location = /prototype` and `location /prototype/` both proxy to Next, no URI on `proxy_pass` |

> [!WARNING]
> Changing `basePath` in `next.config.mjs` without updating `nginx-app.conf` (or vice versa) breaks every internal link and static asset.

**Why no trailing path on `proxy_pass`:** Next.js with `basePath: '/prototype'` expects requests to arrive at `/prototype/...`. If `proxy_pass` stripped the prefix, Next would receive the wrong path and asset resolution would break. With no URI on `proxy_pass`, nginx forwards the original URI unchanged, which is what basePath requires.

**Why nginx does not redirect:** Next owns URL canonicalization — with the default `trailingSlash: false` it serves `/prototype` and redirects `/prototype/` → `/prototype`. So nginx proxies both straight through and adds no redirect of its own. An nginx redirect here would fight Next's and loop forever (HTTP 308 ↔ 308).

**Legacy `/app` redirect:** `nginx-app.conf` also carries a small 301 redirect from the old `/app` path (`/app` and `/app/*`) to `/prototype` (and `/prototype/*`), preserving sub-path and query string. Drop it once nothing still links to `/app`.

---

## Deploy

Deploy is two commands across the two repos: `dfo-dcp` builds and pushes an immutable image; `dfo-infra` applies it and records it as the source of truth.

### 1. Build + push (from dfo-dcp)

```
$ just deploy
Building dfo-services-image:latest ... for linux/amd64...
...
Pushed: northamerica-northeast1-docker.pkg.dev/dev-fin-observatory/datacommons/dfo-services-image:dfo-dev-1a2b3c
Next — deploy it from dfo-infra:
  cd ../dfo-infra && just deploy northamerica-northeast1-docker.pkg.dev/.../dfo-services-image:dfo-dev-1a2b3c
```

The image is tagged `dfo-dev-<git-sha>` — a fresh, immutable tag every commit, so Terraform always sees a new revision (never `:latest`, which wouldn't change the tfvars string and so wouldn't redeploy). Override the registry if needed: `just DOCKER_REGISTRY=<your-registry>/dfo-services-image deploy`.

### 2. Apply (from dfo-infra)

Paste the command the previous step printed:

```
$ cd ../dfo-infra && just deploy <printed-ref>
```

`just deploy` runs `terraform apply -var="datacommons_services_image=<ref>"` (shows the diff and asks to confirm — only the Cloud Run image changes), then on success pins the ref into `infra/dfo-dev/terraform.tfvars` and versions that file to Secret Manager (`dfo-dev-tfvars`). So tfvars/SM always records what's deployed — a bare `just apply` stays correct, and **rollback** is `just deploy <older-ref>` (or revert a Secret Manager version). The service URL is a `*.run.app` address (`just output datacommons_service_url`); no custom domain in this cut.

> [!NOTE]
> `datacommons_services_image` is the only DFO-specific input to the CLI-generated Terraform stack (declared in `infra/dfo-dev/variables.tf`, default `null`). Don't hand-edit the stack beyond this variable — `just deploy` manages it for you.

---

## Keeping in sync with upstream

The only files that can conflict on upstream sync are the three seam files (`build/cdc_services/Dockerfile`, `run.sh`, `nginx.conf`). Everything under `custom_dc/dfo/` and `custom_dc/api_server/` is untouched by upstream.

### Workflow

1. **Check what changed:**

   ```
   $ just sync
   Commits behind upstream/customdc_stable: 12
   ```

2. **Merge:**

   ```
   $ just sync-auto
   ```

   On a clean merge, this updates submodules and runs `check-overrides`. On conflicts, it lists them and offers options.

3. **Resolve conflicts:**

   - `just sync-resolve` — accepts upstream for everything except paths in `.dfo-protected-paths`; lists the protected files for manual resolution.
   - `just sync-theirs` — accepts upstream for all conflicts. Use when none of the conflicting files are DFO-owned.
   - `just sync-abort` — abort and return to the pre-merge state.

4. **Check for stray conflict markers:**

   ```
   $ just check-markers
   ```

5. **Check seam file changes:**

   ```
   $ just check-overrides
   ```

   This compares each upstream seam file against its last merge base. If an upstream commit touched `Dockerfile`, `run.sh`, or `nginx.conf`, it prints a warning:

   ```
   WARNING  build/cdc_services/run.sh
      DFO override/seam: custom_dc/dfo/start.sh
      Changes: 1 file changed, 3 insertions(+)
   ```

   When this fires, read the upstream diff (`git diff <merge-base>..upstream/customdc_stable -- build/cdc_services/run.sh`), confirm the DFO hooks are still in place and still correct, then rebuild and run the e2e check.

`.dfo-protected-paths` lists the paths `sync-resolve` protects from auto-resolution. `.dfo-overridden-files` maps each seam file to its DFO delegate(s), which is what `check-overrides` reads.

---

## Crash isolation

`start.sh` runs the Next.js server inside a supervisor subshell:

```bash
(
  trap "exit" INT TERM
  while true; do
    echo "Starting DFO Next.js app on :$DFO_PORT"
    if [[ "${DEBUG:-false}" == "true" ]]; then
      npm --prefix "$DFO_DIR" run dev \
        || echo "DFO app exited ($?). Restarting in 2s..." >&2
    else
      PORT="$DFO_PORT" HOSTNAME=127.0.0.1 node "$DFO_DIR/server.js" \
        || echo "DFO app exited ($?). Restarting in 2s..." >&2
    fi
    sleep 2
  done
) &
```

`DEBUG=true` swaps `node server.js` for `npm run dev` (hot reload); both run under
the same supervisor.

The subshell loops forever and never exits on its own, so `run.sh`'s `wait -n` never sees it die. A Next.js crash restarts Next in ~2 seconds without affecting the mixer, website, or MCP process. The DC site stays up.

A crash in a DC service (mixer, website, NL, or MCP) still hits `wait -n` and exits the container, triggering a Cloud Run restart. That is upstream's intended behaviour and is unchanged.

---

## File map

### `custom_dc/dfo/`

| File              | Purpose                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `env.list.sample` | template for `env.list`; fill in and copy, never commit                                                                          |
| `start.sh`        | sourced by `run.sh`; starts the Next standalone server in its own restart-loop subshell                                          |
| `nginx-app.conf`  | included by `nginx.conf`; proxies `/prototype`+`/prototype/`, `/api/search/`, and `/api/datasets` to Next on :3000, redirects legacy `/app` paths to `/prototype`, and gzips JSON, CSV, and SDMX CSV responses |
| `prototypes/`     | the Next.js app — see below                                                                                                      |

### `custom_dc/dfo/prototypes/`

| File                         | Purpose                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`               | npm manifest (`dfo-prototypes`); Next `^16.2`, React `^19`, TypeScript `^6`                                                           |
| `package-lock.json`          | committed; required by `npm ci` in the Dockerfile                                                                                     |
| `next.config.mjs`            | `basePath: '/prototype'`, `output: 'standalone'`, `reactStrictMode: true`, `outputFileTracingRoot: import.meta.dirname`, dev rewrites |
| `tsconfig.json`              | TypeScript config; `strict`, `@/*` alias                                                                                              |
| `.gitignore`                 | ignores `node_modules`, `.next`, `next-env.d.ts`, `*.tsbuildinfo`                                                                     |
| `app/page.tsx`               | `/prototype` index                                                                                                                    |
| `app/search/`                | the Sentence Search surface                                                                                                           |
| `lib/client/searchClient.ts` | typed browser client for the Search API                                                                                               |
| `public/.gitkeep`            | keeps `public/` in the build context                                                                                                  |

### Seam edits in upstream files

| Upstream file                   | What DFO added                                                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build/cdc_services/Dockerfile` | `# >>> DFO bake-in >>>` blocks (a `node:20 AS dfo-dcp` build stage over `custom_dc/dfo/prototypes/` + a COPY block into the runner — standalone bundle, `.next/static`, `public`, `start.sh`/`nginx-app.conf`, `node` binary) |
| `build/cdc_services/run.sh`     | One guarded line before `wait -n`: `[ -f /workspace/custom_dc/dfo/start.sh ] && source /workspace/custom_dc/dfo/start.sh`                                                                                                     |
| `build/cdc_services/nginx.conf` | One include line inside `server {}`: `include /workspace/custom_dc/*/nginx-*.conf;` (covers `custom_dc/dfo/nginx-app.conf`)                                                                                                   |

---

## Troubleshooting

**`/prototype` returns 404**

- Most likely: `next.config.mjs` `basePath` does not match the `location` block in `nginx-app.conf`. Confirm both say `/prototype`.
- Less likely: the Next.js process did not start. Check container logs for `Starting DFO Next.js app on :3000`. If it is absent, `start.sh` may not have been sourced (check that the hook line is present in `run.sh`).

**`DC_API_KEY not specified` in container logs**

`run.sh` fails fast if `DC_API_KEY` is empty. Run `just env` to (re)populate an empty key from Secret Manager (it leaves already-set keys untouched), or open `custom_dc/dfo/env.list` and fix the value by hand.

**Standalone path mismatch after a Next.js upgrade**

If the container starts but `/prototype` shows a module-not-found error, the standalone entry point moved. Check what `next build` emits:

```
$ cd custom_dc/dfo/prototypes && npm run build
```

Look for `server.js` in `.next/standalone/`. Then confirm the Dockerfile `COPY --from=dfo-dcp` destination and `start.sh`'s `node "$DFO_DIR/server.js"` path agree with the emitted file. All three must point to the same location.

> [!IMPORTANT]
> Do not add a `webpack` block to `next.config.mjs`. Turbopack is the default bundler on Next 16 — adding webpack configuration causes `next build` to fail unless `--webpack` is explicitly passed. Use `reactStrictMode`, `basePath`, `output`, and `outputFileTracingRoot` only.

**Container fails to start the Next.js process**

The runner base image (`datacommons-services-runtime`) has **no `node` in its PATH**, so `start.sh`'s `node server.js` would fail on its own. The Dockerfile therefore copies the `node:20` binary into the runtime image:

```dockerfile
COPY --from=dfo-dcp /usr/local/bin/node /usr/local/bin/node
```

This is required, not optional. You can confirm the base still lacks node with:

```
$ docker run --rm gcr.io/datcom-ci/datacommons-services-runtime:2024-08-08 node --version
# exec: "node": executable file not found in $PATH
```

The copy is ABI-safe because both the build stage (`node:20`) and the runtime base are Debian 12 (bookworm, glibc 2.36), and the base already ships `libstdc++`/`libgcc`. The `node` binary is dynamically linked, not static — so if a future runtime base bumps glibc or drops those libs, re-check with `ldd /usr/local/bin/node` inside the runner before deploying.
