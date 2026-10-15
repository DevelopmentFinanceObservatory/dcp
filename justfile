# DFO — Developer Commands
# Run 'just' or 'just --list' to see all available targets.
#
# Override defaults from the command line:
#   just IMAGE_TAG=v1.2.0 build
#   just IMAGE_TAG=v1.2.0 push
#   just ENV_FILE=custom_dc/dfo/env.staging.list run-local

# Configuration (override any of these from the command line)
IMAGE_NAME   := "dfo-services-image"
IMAGE_TAG    := "latest"
IMAGE        := IMAGE_NAME + ":" + IMAGE_TAG
DOCKERFILE   := "build/cdc_services/Dockerfile"
ENV_FILE     := "custom_dc/dfo/env.list"
ENV_SAMPLE   := "custom_dc/dfo/env.list.sample"
UPSTREAM_BRANCH := "customdc_stable"

# Deployment tier. Selects the image tag prefix (dfo-<tier>-<sha>) and the
# branch `deploy` expects to be on. Override for a prod cut:
#   just DEPLOY_ENV=prod deploy
DEPLOY_ENV := "dev"

# Load registry config from env file if it exists
DOCKER_REGISTRY := env_var_or_default("DOCKER_REGISTRY", "northamerica-northeast1-docker.pkg.dev/dev-fin-observatory/datacommons/dfo-services-image")
GOOGLE_CLOUD_REGION := env_var_or_default("GOOGLE_CLOUD_REGION", "northamerica-northeast1")
# Website origin baked into the Next.js rewrites by `build` and read by `dev`. The
# prototype reaches dfo-apis through the website's /api/search and /api/datasets
# proxy. The dev tier falls back to the dev website. A prod build must name its own origin
# (DFO_SITE_ORIGIN=<origin> just DEPLOY_ENV=prod deploy); without it just stops with
# "environment variable `DFO_SITE_ORIGIN` not present".
DFO_SITE_ORIGIN := if DEPLOY_ENV == "prod" { env_var("DFO_SITE_ORIGIN") } else { env_var_or_default("DFO_SITE_ORIGIN", "https://dfo-dev-website-staging-zms5lj4zhq-nn.a.run.app") }

# GCP Application Default Credentials path (for mounting into Docker)
GCP_ADC := env_var("HOME") / ".config/gcloud/application_default_credentials.json"

# Local data directories (read from env file, with sample fallback)
INPUT_DIR  := `{ grep -s '^INPUT_DIR=' custom_dc/dfo/env.list || grep -s '^INPUT_DIR=' custom_dc/dfo/env.list.sample || echo "INPUT_DIR=$PWD/custom_dc/sample"; } | head -1 | cut -d= -f2`
OUTPUT_DIR := `{ grep -s '^OUTPUT_DIR=' custom_dc/dfo/env.list || grep -s '^OUTPUT_DIR=' custom_dc/dfo/env.list.sample || echo "OUTPUT_DIR=$PWD/custom_dc/sample_output"; } | head -1 | cut -d= -f2`

# Show available commands (default)
_default:
    @just --list --unsorted

# ── Setup & Configuration ────────────────────────────

# First-time setup: create env file and configure Docker auth for Artifact Registry
setup: env
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Configuring Docker authentication for Artifact Registry..."
    # Derive the registry hostname from DOCKER_REGISTRY (the single source of
    # truth for where images are pushed) rather than GOOGLE_CLOUD_REGION, which
    # tracks the Cloud Run deploy region and may differ from the registry's.
    gcloud auth configure-docker "$(echo '{{DOCKER_REGISTRY}}' | cut -d/ -f1)" --quiet
    echo ""
    # Register the 'ours' merge driver so the README.md merge=ours rule in
    # .gitattributes takes effect and upstream syncs never clobber our README.
    git config merge.ours.driver true
    echo ""
    echo "Updating git submodules..."
    ./scripts/update_git_submodules.sh
    echo ""
    echo "Setup complete. Run 'just run-local' to start the application."

# Create local env file (fetches DC/Maps keys from Secret Manager, prompts as fallback)
env:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="{{ENV_FILE}}"
    SAMPLE="{{ENV_SAMPLE}}"
    PROJECT="dev-fin-observatory"
    if [ ! -f "$SAMPLE" ]; then
        echo "Error: $SAMPLE not found. Cannot create env file."
        exit 1
    fi
    if [ ! -f "$TARGET" ]; then
        echo "Copying $SAMPLE -> $TARGET..."
        cp "$SAMPLE" "$TARGET"
        echo ""
    fi
    ask() {
        local prompt="$1" default="${2:-}" value
        if [ -n "$default" ]; then
            read -rp "  $prompt [$default]: " value
            echo "${value:-$default}"
        else
            while true; do
                read -rp "  $prompt: " value
                [ -n "$value" ] && break
                echo "  (required)" >&2
            done
            echo "$value"
        fi
    }
    set_or_prompt() {
        local key="$1" prompt="$2"
        local current
        current=$(grep -s "^${key}=" "$TARGET" | head -1 | cut -d= -f2-)
        if [ -z "$current" ]; then
            local value="${!key:-}"   # env-var override (e.g. OUTPUT_DIR=/data just env)
            [ -n "$value" ] || value=$(ask "$prompt")
            # Replace the empty key line if present, otherwise append
            if grep -q "^${key}=$" "$TARGET" 2>/dev/null; then
                sed -i.bak "s|^${key}=$|${key}=${value}|" "$TARGET" && rm -f "${TARGET}.bak"
            else
                echo "${key}=${value}" >> "$TARGET"
            fi
            echo "  Set $key."
        else
            echo "  $key already set."
        fi
    }
    fetch_secret() {
        # Value of the first Secret Manager secret whose name contains the substring.
        local filter="$1" name
        name=$(gcloud secrets list --project="$PROJECT" \
            --filter="name~${filter}" --format="value(name)" 2>/dev/null | head -1)
        [ -n "$name" ] && gcloud secrets versions access latest --secret="$name" --project="$PROJECT" 2>/dev/null || true
    }
    set_from_secret_or_prompt() {
        local key="$1" prompt="$2" filter="$3" current value
        current=$(grep -s "^${key}=" "$TARGET" | head -1 | cut -d= -f2-)
        if [ -n "$current" ]; then echo "  $key already set."; return; fi
        value="${!key:-}"   # env-var override wins over Secret Manager
        if [ -n "$value" ]; then
            echo "  $key taken from environment."
        else
            value=$(fetch_secret "$filter")
            if [ -n "$value" ]; then echo "  $key fetched from Secret Manager."; else value=$(ask "$prompt"); fi
        fi
        if grep -q "^${key}=$" "$TARGET" 2>/dev/null; then
            sed -i.bak "s|^${key}=$|${key}=${value}|" "$TARGET" && rm -f "${TARGET}.bak"
        else
            echo "${key}=${value}" >> "$TARGET"
        fi
        echo "  Set $key."
    }
    echo "Checking required environment variables..."
    echo "  (DC/Maps keys are pulled from Secret Manager; falls back to prompting.)"
    set_from_secret_optional() {
        # Like set_from_secret_or_prompt but never prompts: fetch from Secret
        # Manager (or env-var override) and leave blank if not found. Used for
        # optional keys whose absence degrades gracefully (e.g. the Search API).
        local key="$1" filter="$2" current value
        current=$(grep -s "^${key}=" "$TARGET" | head -1 | cut -d= -f2-)
        if [ -n "$current" ]; then echo "  $key already set."; return; fi
        value="${!key:-}"
        [ -n "$value" ] || value=$(fetch_secret "$filter")
        if grep -q "^${key}=$" "$TARGET" 2>/dev/null; then
            sed -i.bak "s|^${key}=$|${key}=${value}|" "$TARGET" && rm -f "${TARGET}.bak"
        else
            echo "${key}=${value}" >> "$TARGET"
        fi
        if [ -n "$value" ]; then echo "  Set $key."; else echo "  $key left blank (Search API disabled until set)."; fi
    }
    set_from_secret_or_prompt "DC_API_KEY" "DC API key" "dfo-dev-dc-api-key"
    set_from_secret_or_prompt "MAPS_API_KEY" "Maps API key" "dfo-dev-dc-google-maps-api-key"
    set_from_secret_optional "GEMINI_API_KEY" "dfo-dev-gemini-api-key"
    set_or_prompt "OUTPUT_DIR" "Output directory (absolute path)"
    echo ""
    echo "$TARGET is ready. Run 'just run-local' to start."

# ── TypeScript ───────────────────────────────────────

# Run TypeScript type checker in custom_dc/dfo/prototypes (fast feedback before a slow Docker build)
typecheck:
    #!/usr/bin/env bash
    set -euo pipefail
    cd custom_dc/dfo/prototypes
    # Stale if node_modules is absent or package-lock.json is newer than the last install marker.
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ] || [ package-lock.json -nt "node_modules/.package-lock.json" ]; then
        echo "Dependencies are missing or out of date."
        read -r -p "Install now? [Y/n] " ans || true
        case "${ans:-Y}" in
            [Nn]*) echo "Skipping install — typecheck may fail." ;;
            *) npm ci --ignore-scripts; echo "" ;;
        esac
    fi
    echo "Running TypeScript type checker..."
    npm run typecheck

# ── Building ─────────────────────────────────────────

# Build Docker image for linux/amd64 (Cloud Run target). Override tag: just IMAGE_TAG=v1.0 build
build: typecheck
    @echo "Building {{IMAGE}} from {{DOCKERFILE}} for linux/amd64..."
    docker buildx build --platform linux/amd64 --provenance=false --load \
        --build-arg DFO_SITE_ORIGIN={{DFO_SITE_ORIGIN}} \
        --tag {{IMAGE}} -f {{DOCKERFILE}} .

# Build and run in one step
build-run: build run

# ── Running Locally ───────────────────────────────────

# Run the baked image locally (port 8080)
run-local: _check-env _check-gcloud
    docker run -it \
        --init \
        --env-file {{ENV_FILE}} \
        -p 8080:8080 \
        -e INPUT_DIR={{INPUT_DIR}} \
        -e OUTPUT_DIR={{OUTPUT_DIR}} \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json \
        -v {{GCP_ADC}}:/gcp/adc.json:ro \
        -v {{INPUT_DIR}}:{{INPUT_DIR}} \
        -v {{OUTPUT_DIR}}:{{OUTPUT_DIR}} \
        {{IMAGE}}

# Alias for run-local (familiar shorthand)
run: run-local

# Hot-reload dev: DC services in a background container, Next runs natively on the host.
# The host is arm64 and the image is amd64, so we can't run `next dev` (native SWC) inside
# the container against host node_modules — instead the container just exposes mixer on :8081
# and host `next dev` server-side-fetches it via DC_API_BASE_URL. typecheck dep installs deps.
dev: typecheck _check-env _check-gcloud
    #!/usr/bin/env bash
    set -euo pipefail
    cleanup() {
        [ -n "${cid:-}" ] && docker stop "$cid" >/dev/null 2>&1 || true
    }
    trap cleanup EXIT INT TERM
    cid=$(docker run -d --rm --init \
        --env-file {{ENV_FILE}} \
        -p 8080:8080 -p 8081:8081 \
        -e INPUT_DIR={{INPUT_DIR}} \
        -e OUTPUT_DIR={{OUTPUT_DIR}} \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json \
        -v {{GCP_ADC}}:/gcp/adc.json:ro \
        -v {{INPUT_DIR}}:{{INPUT_DIR}} \
        -v {{OUTPUT_DIR}}:{{OUTPUT_DIR}} \
        {{IMAGE}})
    echo "DC services container: ${cid:0:12} (mixer :8081, nginx :8080)"
    echo "Waiting for mixer..."
    for _ in $(seq 1 60); do
        curl -sf http://127.0.0.1:8081/version >/dev/null 2>&1 && break
        sleep 2
    done

    echo "Starting Next dev → http://localhost:3000/prototype  (Ctrl-C stops all)"
    cd custom_dc/dfo/prototypes
    DC_API_BASE_URL=http://127.0.0.1:8081/v2 DFO_SITE_ORIGIN={{DFO_SITE_ORIGIN}} npm run dev

# Stop all running dfo-services containers
stop:
    #!/usr/bin/env bash
    docker ps --filter "ancestor={{IMAGE}}" -q | xargs -r docker stop
    echo "Stopped."

# Drop into a bash shell inside the container (for debugging)
shell: _check-env _check-gcloud
    docker run -it \
        --init \
        --env-file {{ENV_FILE}} \
        -p 8080:8080 \
        -e DEBUG=true \
        -e INPUT_DIR={{INPUT_DIR}} \
        -e OUTPUT_DIR={{OUTPUT_DIR}} \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json \
        -v {{GCP_ADC}}:/gcp/adc.json:ro \
        -v {{INPUT_DIR}}:{{INPUT_DIR}} \
        -v {{OUTPUT_DIR}}:{{OUTPUT_DIR}} \
        {{IMAGE}} \
        /bin/bash

# Show current branch, remotes, Docker images, and env file status
status:
    #!/usr/bin/env bash
    echo "Git branch:"
    git branch --show-current
    echo ""
    echo "Remotes:"
    git remote -v
    echo ""
    echo "Docker images (dfo):"
    docker images | grep -E "dfo|REPOSITORY" || echo "  (none found)"
    echo ""
    echo "Env file:"
    if [ -f "{{ENV_FILE}}" ]; then echo "  ok {{ENV_FILE}}"; else echo "  missing {{ENV_FILE}} (run 'just env')"; fi

# Remove built Docker image
clean:
    #!/usr/bin/env bash
    docker rmi {{IMAGE}} 2>/dev/null || true
    docker rmi {{DOCKER_REGISTRY}}:{{IMAGE_TAG}} 2>/dev/null || true
    echo "Cleaned."

# ── Deploying ─────────────────────────────────────────

# Tag and push image to Artifact Registry (override tag: just IMAGE_TAG=v1.0 push)
push: _check-env
    @echo "Tagging {{IMAGE}} -> {{DOCKER_REGISTRY}}:{{IMAGE_TAG}}..."
    docker tag {{IMAGE}} {{DOCKER_REGISTRY}}:{{IMAGE_TAG}}
    @echo "Pushing to {{DOCKER_REGISTRY}}:{{IMAGE_TAG}}..."
    docker push {{DOCKER_REGISTRY}}:{{IMAGE_TAG}}

# Break-glass: build and push an immutable dfo-<tier>-<git-sha> image by
# hand. deploy-dev.yml and deploy-prod.yml do the same build routinely and also
# open the infra repo's pin PR; this recipe doesn't touch that pin, so making the
# result live still means hand-editing the infra repo's
# infra/dfo-<tier>/dcp/image.auto.tfvars and opening a PR yourself. Reach for
# it only when CI is down or to test an unmerged commit.
# Defaults to the dev tier. For a prod cut, set the registry and the website
# origin explicitly:
#   DOCKER_REGISTRY=<prod registry path> DFO_SITE_ORIGIN=<origin> just DEPLOY_ENV=prod deploy
deploy: build
    #!/usr/bin/env bash
    set -euo pipefail
    TIER="{{DEPLOY_ENV}}"
    # Full sha for the pushed tag, matching the deploy workflows -- a short sha
    # isn't unique enough once several images sit in Artifact Registry.
    SHA=$(git rev-parse HEAD)
    BRANCH=$(git rev-parse --abbrev-ref HEAD)

    # Each tier is cut from one branch: dev from dev, prod from main. A mismatch
    # is usually a mistake, so warn loudly rather than silently tag the wrong tier.
    case "$TIER" in
        dev)  EXPECTED=dev ;;
        prod) EXPECTED=main ;;
        *)    EXPECTED="" ;;
    esac
    if [ -n "$EXPECTED" ] && [ "$BRANCH" != "$EXPECTED" ]; then
        echo "WARNING: DEPLOY_ENV=$TIER expects branch '$EXPECTED' but you are on '$BRANCH'." >&2
    fi

    # A dirty tree is a warning for dev and a hard stop for prod: a prod image must
    # be reproducible from a committed sha.
    if ! git diff --quiet || ! git diff --cached --quiet; then
        if [ "$TIER" = prod ]; then
            echo "ERROR: uncommitted changes present. Commit before cutting a prod image." >&2
            exit 1
        fi
        echo "WARNING: uncommitted changes present — tagging $SHA from a dirty tree." >&2
    fi

    REF="{{DOCKER_REGISTRY}}:dfo-$TIER-$SHA"
    echo "Tagging {{IMAGE}} -> $REF"
    docker tag {{IMAGE}} "$REF"
    echo "Pushing $REF"
    docker push "$REF"

    # dfo-infra's pin only accepts a digest now, never a tag (see
    # deploy/README.md), so resolve the digest docker just recorded for
    # this push rather than handing back the tag.
    DIGEST_REF=$(docker inspect --format='{{{{index .RepoDigests 0}}' "$REF")

    echo ""
    echo "Pushed: $REF"
    echo "Digest: $DIGEST_REF"
    echo "This is break-glass -- it does not touch the infra repo's pin. To make it live:"
    echo "  edit the infra repo's infra/dfo-$TIER/dcp/image.auto.tfvars to \"$DIGEST_REF\" and open a PR."

# ── Upstream Sync ─────────────────────────────────────

# Fetch upstream and show what's changed since last sync
sync:
    #!/usr/bin/env bash
    set -euo pipefail
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "Fetching from upstream..."
    git fetch upstream
    echo ""
    echo "Current branch: $CURRENT_BRANCH"
    BEHIND=$(git rev-list --count HEAD..upstream/{{UPSTREAM_BRANCH}})
    echo "Commits behind upstream/{{UPSTREAM_BRANCH}}: $BEHIND"
    echo ""
    if [ "$BEHIND" -eq 0 ]; then
        echo "Already up to date."
    else
        echo "To merge, run one of:"
        echo "  just sync-auto       # merge, keep both sides (may need manual conflict resolution)"
        echo "  just sync-theirs     # merge, prefer upstream for conflicts (safe for most files)"
        echo "  just sync-abort      # abort a failed merge and start over"
    fi

# Merge upstream, stop on conflicts for manual resolution
sync-auto:
    #!/usr/bin/env bash
    set -euo pipefail
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "Fetching from upstream..."
    git fetch upstream
    echo ""
    echo "Merging upstream/{{UPSTREAM_BRANCH}} into $CURRENT_BRANCH..."
    if git merge -X no-renames upstream/{{UPSTREAM_BRANCH}}; then
        echo ""
        # Check for conflict markers that slipped into committed files (rename detection artifacts)
        STRAY=$(git diff HEAD~1 HEAD -S'<<<<<<<' --name-only 2>/dev/null || true)
        if [ -n "$STRAY" ]; then
            echo "═══════════════════════════════════════════════════════"
            echo " WARNING  Conflict markers found in merged files:"
            echo "═══════════════════════════════════════════════════════"
            echo "$STRAY"
            echo ""
            echo "Fix these files, then: git add <files> && git commit --amend --no-edit"
        else
            echo "Updating submodules..."
            ./scripts/update_git_submodules.sh
            echo ""
            just check-overrides
            echo ""
            echo "Sync complete. No conflicts."
        fi
    else
        echo ""
        CONFLICTS=$(git diff --name-only --diff-filter=U)
        COUNT=$(echo "$CONFLICTS" | wc -l | tr -d ' ')
        echo "═══════════════════════════════════════════"
        echo " $COUNT files with conflicts"
        echo "═══════════════════════════════════════════"
        echo ""
        echo "$CONFLICTS"
        echo ""
        echo "Options:"
        echo "  just sync-theirs     # accept upstream version for ALL conflicts"
        echo "  just sync-resolve    # accept upstream for most, protect DFO-modified files"
        echo "  just sync-abort      # abort merge and go back to previous state"
    fi

# Merge upstream, accept their version for all conflicts
sync-theirs:
    #!/usr/bin/env bash
    set -euo pipefail
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    # Start merge if not already mid-merge
    if git rev-parse --verify MERGE_HEAD > /dev/null 2>&1; then
        echo "Continuing in-progress merge..."
    else
        echo "Fetching from upstream..."
        git fetch upstream
        echo ""
        echo "Merging upstream/{{UPSTREAM_BRANCH}} into $CURRENT_BRANCH..."
        git merge -X no-renames upstream/{{UPSTREAM_BRANCH}} || true
    fi
    echo ""
    # Resolve each conflict type
    # UU = both modified, AA = both added — accept theirs
    UU_AA=$(git status --porcelain | grep "^UU\|^AA" | awk '{print $2}' | grep -v "^import$" || true)
    if [ -n "$UU_AA" ]; then
        COUNT=$(echo "$UU_AA" | wc -l | tr -d ' ')
        echo "Accepting upstream version for $COUNT conflicted files..."
        echo "$UU_AA" | while read -r file; do
            git checkout --theirs -- "$file" 2>/dev/null && git add "$file"
        done
        echo ""
    fi
    # UD = deleted by upstream, modified by us — remove
    UD=$(git status --porcelain | grep "^UD" | awk '{print $2}' || true)
    if [ -n "$UD" ]; then
        echo "Removing files deleted by upstream..."
        echo "$UD" | while read -r file; do
            git rm --force "$file" 2>/dev/null || true
        done
        echo ""
    fi
    # DU = deleted by us, modified by upstream — accept theirs
    DU=$(git status --porcelain | grep "^DU" | awk '{print $2}' || true)
    if [ -n "$DU" ]; then
        echo "Restoring files upstream modified that we had deleted..."
        echo "$DU" | while read -r file; do
            git checkout --theirs -- "$file" 2>/dev/null && git add "$file" 2>/dev/null || true
        done
        echo ""
    fi
    # DD = both deleted (rename conflicts) — just remove
    DD=$(git status --porcelain | grep "^DD" | awk '{print $2}' || true)
    if [ -n "$DD" ]; then
        echo "Removing files deleted by both sides..."
        echo "$DD" | while read -r file; do
            git rm --force "$file" 2>/dev/null || git add "$file" 2>/dev/null || true
        done
        echo ""
    fi
    # Complete the merge
    if git rev-parse --verify MERGE_HEAD > /dev/null 2>&1; then
        git commit --no-edit
    fi
    echo ""
    # Check for conflict markers that slipped into committed files (rename detection artifacts)
    STRAY=$(git diff HEAD~1 HEAD -S'<<<<<<<' --name-only 2>/dev/null || true)
    if [ -n "$STRAY" ]; then
        echo "═══════════════════════════════════════════════════════"
        echo " WARNING  Conflict markers found in merged files:"
        echo "═══════════════════════════════════════════════════════"
        echo "$STRAY"
        echo ""
        echo "Fix these files, then: git add <files> && git commit --amend --no-edit"
    else
        echo "Updating submodules..."
        ./scripts/update_git_submodules.sh
        echo ""
        just check-overrides
        echo ""
        echo "Sync complete. All conflicts resolved using upstream versions."
    fi

# Merge upstream, accept theirs for most files but protect DFO-customized paths
sync-resolve:
    #!/usr/bin/env bash
    set -euo pipefail
    PROTECTED_FILE=".dfo-protected-paths"
    # Check if we're mid-merge
    if ! git rev-parse --verify MERGE_HEAD > /dev/null 2>&1; then
        echo "No merge in progress. Run 'just sync-auto' first."
        exit 1
    fi
    # Load protected paths (strip comments and blanks)
    if [ ! -f "$PROTECTED_FILE" ]; then
        echo "Warning: $PROTECTED_FILE not found. All conflicts will use upstream version."
        PROTECTED=""
    else
        PROTECTED=$(grep -v '^#' "$PROTECTED_FILE" | grep -v '^$')
    fi
    is_protected() {
        local file="$1"
        while IFS= read -r pattern; do
            [ -z "$pattern" ] && continue
            # Directory prefix match (pattern ends with /)
            if [[ "$pattern" == */ ]] && [[ "$file" == "$pattern"* ]]; then
                return 0
            fi
            # Exact match
            if [[ "$file" == "$pattern" ]]; then
                return 0
            fi
        done <<< "$PROTECTED"
        return 1
    }
    # Categorize all conflicts
    ALL_CONFLICTS=$(git status --porcelain | grep "^UU\|^AA\|^UD\|^DU\|^DD\|^AU\|^UA" || true)
    AUTO_COUNT=0
    REVIEW_LIST=""
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        status="${line:0:2}"
        file="${line:3}"
        if is_protected "$file"; then
            REVIEW_LIST="$REVIEW_LIST"$'\n'"  [$status] $file"
            continue
        fi
        case "$status" in
            "UU"|"AA")
                git checkout --theirs -- "$file" 2>/dev/null && git add "$file"
                ((AUTO_COUNT++)) || true
                ;;
            "UD")
                git rm --force "$file" 2>/dev/null || true
                ((AUTO_COUNT++)) || true
                ;;
            "DU")
                git checkout --theirs -- "$file" 2>/dev/null && git add "$file" 2>/dev/null || true
                ((AUTO_COUNT++)) || true
                ;;
            "DD")
                git rm --force "$file" 2>/dev/null || git add "$file" 2>/dev/null || true
                ((AUTO_COUNT++)) || true
                ;;
            "UA"|"AU")
                git checkout --theirs -- "$file" 2>/dev/null && git add "$file" 2>/dev/null || true
                ((AUTO_COUNT++)) || true
                ;;
        esac
    done <<< "$ALL_CONFLICTS"
    echo "Auto-resolved $AUTO_COUNT files using upstream version."
    echo ""
    # Report protected files that still need review
    REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
    REVIEW_LIST=$(echo "$REVIEW_LIST" | sed '/^$/d')
    if [ -n "$REMAINING" ] || [ -n "$REVIEW_LIST" ]; then
        echo "═══════════════════════════════════════════════════════"
        echo " Protected files needing manual review:"
        echo "═══════════════════════════════════════════════════════"
        if [ -n "$REVIEW_LIST" ]; then
            echo "$REVIEW_LIST"
        fi
        echo ""
        echo "Protected paths loaded from: $PROTECTED_FILE"
        echo ""
        echo "Resolve these manually, then run:"
        echo "  git add <files>"
        echo "  git commit --no-edit"
        echo "  just check-markers"
        echo "  just submodules"
        echo "  just check-overrides"
    else
        git commit --no-edit
        echo ""
        # Check for conflict markers that slipped into committed files (rename detection artifacts)
        STRAY=$(git diff HEAD~1 HEAD -S'<<<<<<<' --name-only 2>/dev/null || true)
        if [ -n "$STRAY" ]; then
            echo "═══════════════════════════════════════════════════════"
            echo " WARNING  Conflict markers found in merged files:"
            echo "═══════════════════════════════════════════════════════"
            echo "$STRAY"
            echo ""
            echo "Fix these files, then: git add <files> && git commit --amend --no-edit"
        else
            echo "Updating submodules..."
            ./scripts/update_git_submodules.sh
            echo ""
            just check-overrides
            echo ""
            echo "Sync complete."
        fi
    fi

# Abort a failed merge and return to previous state
sync-abort:
    #!/usr/bin/env bash
    if git rev-parse --verify MERGE_HEAD > /dev/null 2>&1; then
        git merge --abort
        echo "Merge aborted. Back to clean state."
    else
        echo "No merge in progress."
    fi

# Check for stray conflict markers in tracked files (catches rename detection artifacts)
check-markers:
    #!/usr/bin/env bash
    MARKERS=$(git grep -l '<<<<<<<' -- ':!*.md' ':!justfile' 2>/dev/null || true)
    if [ -n "$MARKERS" ]; then
        echo "═══════════════════════════════════════════════════════"
        echo " WARNING  Conflict markers found in tracked files:"
        echo "═══════════════════════════════════════════════════════"
        echo "$MARKERS"
        echo ""
        echo "Fix these files before building."
        exit 1
    else
        echo "No stray conflict markers found."
    fi

# Update git submodules
submodules:
    ./scripts/update_git_submodules.sh

# Check if upstream changed files that DFO overrides (run after sync)
check-overrides:
    #!/usr/bin/env bash
    OVERRIDES_FILE=".dfo-overridden-files"
    if [ ! -f "$OVERRIDES_FILE" ]; then
        echo "Warning: $OVERRIDES_FILE not found."
        exit 0
    fi
    # Find the merge base with upstream
    MERGE_BASE=$(git merge-base HEAD upstream/{{UPSTREAM_BRANCH}} 2>/dev/null)
    if [ -z "$MERGE_BASE" ]; then
        echo "Could not find merge base with upstream. Run 'git fetch upstream' first."
        exit 0
    fi
    CHANGED_COUNT=0
    WARNINGS=""
    while IFS= read -r line; do
        # Skip comments and blanks
        [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
        upstream_file=$(echo "$line" | sed 's/ *->.*$//' | xargs)
        dfo_file=$(echo "$line" | sed 's/^.*-> *//' | xargs)
        # Check if upstream changed this file since last merge
        if git diff --quiet "$MERGE_BASE"..upstream/{{UPSTREAM_BRANCH}} -- "$upstream_file" 2>/dev/null; then
            continue
        fi
        ((CHANGED_COUNT++))
        WARNINGS="$WARNINGS\n  WARNING  $upstream_file"
        WARNINGS="$WARNINGS\n     DFO override/seam: $dfo_file"
        # Show a short summary of what changed
        STAT=$(git diff --stat "$MERGE_BASE"..upstream/{{UPSTREAM_BRANCH}} -- "$upstream_file" 2>/dev/null | tail -1)
        if [ -n "$STAT" ]; then
            WARNINGS="$WARNINGS\n     Changes: $STAT"
        fi
        WARNINGS="$WARNINGS\n"
    done < "$OVERRIDES_FILE"
    if [ "$CHANGED_COUNT" -gt 0 ]; then
        echo "═══════════════════════════════════════════════════════════"
        echo " WARNING  $CHANGED_COUNT seam file(s) changed upstream"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
        echo -e "$WARNINGS"
        echo "Review these changes and update the DFO seam files if needed:"
        echo "  git diff $MERGE_BASE..upstream/{{UPSTREAM_BRANCH}} -- <file>"
        echo ""
        echo "Seam files carry DFO hooks (Next.js bake-in, nginx routing, start.sh)."
        echo "Changes upstream may require updating custom_dc/dfo/ seam targets."
    else
        echo "All overridden/seam files are up to date with upstream."
    fi

# ── Internal ──────────────────────────────────────────

_check-env:
    #!/usr/bin/env bash
    if [ ! -f "{{ENV_FILE}}" ]; then
        echo "Error: {{ENV_FILE}} not found."
        echo "Run 'just setup' or 'just env' first."
        exit 1
    fi

_check-gcloud:
    #!/usr/bin/env bash
    if [ ! -f "{{GCP_ADC}}" ]; then
        echo "Error: GCP Application Default Credentials not found."
        echo "Run 'gcloud auth application-default login' to create them."
        exit 1
    fi
