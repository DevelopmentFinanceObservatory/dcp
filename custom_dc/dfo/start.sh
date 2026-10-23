#!/usr/bin/env bash
# DFO prototyping app launcher. Sourced by build/cdc_services/run.sh immediately
# before `wait -n`. Runs the standalone Next.js server under a self-restarting
# supervisor subshell so an app crash restarts Next only — it never trips
# run.sh's `wait -n` and never takes down mixer/website/MCP.
# DC-service deaths (mixer/Envoy/website/MCP) still cycle the container (upstream
# behaviour, unchanged). The subshell loops forever; it exits only on SIGINT/TERM
# (container shutdown), so Cloud Run graceful termination still works.

DFO_DIR=/workspace/custom_dc/dfo/prototypes
DFO_PORT="${DFO_PORT:-3000}"

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
