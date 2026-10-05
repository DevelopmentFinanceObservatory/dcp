#!/usr/bin/env bash
#
# read-skill-submissions.sh - pull skill-comparison reviewer feedback out of Cloud Logging.
#
# The skill-review prototype has no database. Its routes log one JSON line per event to
# stdout, and on Cloud Run that stdout lands in Cloud Logging as structured jsonPayload
# fields. Logging is the store. It captures the question, both answers, the tool calls,
# the winner and the free text in one line, with no extra credentials or a second place
# to look. The `_Default` log bucket keeps 30 days of history, so this script defaults to
# a 30-day window and should run at the end of a review round before that window closes.
#
# `gcloud logging read` returns `[]` and exits 0 on zero matches, which is indistinguishable
# from "nobody has submitted a review yet" unless this script treats an empty result as a
# loud failure rather than silently writing an empty CSV. It does.
#
# Usage: read-skill-submissions.sh [OPTIONS] [DAYS] [OUTPUT_DIR]

set -euo pipefail

PROJECT="dev-fin-observatory"
SERVICE="dfo-dev-dc-datacommons-service"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_OUTDIR="${SCRIPT_DIR}/submissions"

DAYS=30
OUTDIR="${DEFAULT_OUTDIR}"
INCLUDE_COMPARE=0
POSITIONAL=()

usage() {
    cat <<'USAGE'
Usage: read-skill-submissions.sh [OPTIONS] [DAYS] [OUTPUT_DIR]

Reads skill_review_submission log entries written by the skill-comparison prototype's
review routes out of Cloud Logging (project dev-fin-observatory, service
dfo-dev-dc-datacommons-service), and writes them to JSONL and CSV.

Positional arguments:
  DAYS         Number of days back to search. Default: 30, the retention window of the
               `_Default` log bucket. A round longer than this needs a run before
               entries age out.
  OUTPUT_DIR   Directory to write output files into. Default: <script dir>/submissions

Options:
  --include-compare   Also fetch skill_review_compare entries (a question that was asked
                       and answered by both arms but never rated). Written alongside the
                       submissions as compare.jsonl / compare.csv in the same output
                       directory. Missing or zero compare entries are not a fatal error.
  -h, --help           Show this help and exit.

Fails loudly, with a non-zero exit, when gcloud is not installed, when gcloud has no
active credentials (run `gcloud auth login`), when the logging query itself errors, or
when it returns zero submissions.
USAGE
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            usage
            exit 0
            ;;
        --include-compare)
            INCLUDE_COMPARE=1
            shift
            ;;
        --)
            shift
            POSITIONAL+=("$@")
            break
            ;;
        -*)
            echo "ERROR: unrecognized option: $1" >&2
            usage >&2
            exit 1
            ;;
        *)
            POSITIONAL+=("$1")
            shift
            ;;
    esac
done

if [[ ${#POSITIONAL[@]} -ge 1 ]]; then
    DAYS="${POSITIONAL[0]}"
fi
if [[ ${#POSITIONAL[@]} -ge 2 ]]; then
    OUTDIR="${POSITIONAL[1]}"
fi
if [[ ${#POSITIONAL[@]} -ge 3 ]]; then
    echo "ERROR: too many positional arguments (expected at most DAYS and OUTPUT_DIR)" >&2
    usage >&2
    exit 1
fi

if ! [[ "${DAYS}" =~ ^[0-9]+$ ]]; then
    echo "ERROR: DAYS must be a non-negative integer, got: ${DAYS}" >&2
    exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
    echo "ERROR: gcloud is not installed or not on PATH. Install the Google Cloud SDK and retry." >&2
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "ERROR: python3 is not installed or not on PATH. It is required to convert log JSON to CSV." >&2
    exit 1
fi

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>&1)" || {
    echo "ERROR: 'gcloud auth list' failed. Your credentials are likely stale or absent." >&2
    echo "Run: gcloud auth login" >&2
    echo "gcloud said: ${ACTIVE_ACCOUNT}" >&2
    exit 1
}
if [[ -z "${ACTIVE_ACCOUNT}" ]]; then
    echo "ERROR: no active gcloud credentials found. Your login has likely expired." >&2
    echo "Run: gcloud auth login" >&2
    exit 1
fi

mkdir -p "${OUTDIR}"

fetch_log_entries() {
    # fetch_log_entries EVENT_NAME -> prints the gcloud JSON array on stdout
    local event_name="$1"
    local err_file
    err_file="$(mktemp)"
    local raw
    if ! raw="$(gcloud logging read \
        "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE}\" AND jsonPayload.event=\"${event_name}\"" \
        --project="${PROJECT}" \
        --freshness="${DAYS}d" \
        --order=asc \
        --format=json 2>"${err_file}")"; then
        echo "ERROR: 'gcloud logging read' failed for event '${event_name}'." >&2
        echo "This usually means stale or absent credentials (run: gcloud auth login)," >&2
        echo "or missing Logging Viewer permission on project ${PROJECT}." >&2
        echo "gcloud said:" >&2
        cat "${err_file}" >&2
        rm -f "${err_file}"
        exit 1
    fi
    rm -f "${err_file}"
    printf '%s' "${raw}"
}

echo "Querying project ${PROJECT}, service ${SERVICE}, last ${DAYS} day(s)..." >&2

SUBMISSIONS_JSON="$(fetch_log_entries "skill_review_submission")"

SUBMISSION_COUNT="$(printf '%s' "${SUBMISSIONS_JSON}" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
if [[ "${SUBMISSION_COUNT}" -eq 0 ]]; then
    echo "ERROR: zero skill_review_submission entries found in the last ${DAYS} day(s)." >&2
    echo "gcloud logging read returns [] and exits 0 on no matches, which looks identical to" >&2
    echo "an authentication or filter mistake, so this script refuses to write an empty CSV." >&2
    echo "Before assuming nobody has reviewed anything, verify:" >&2
    echo "  gcloud auth list                      # an active account is present" >&2
    echo "  gcloud config get-value project        # matches, or is overridden correctly by --project=${PROJECT}" >&2
    echo "  the review routes are actually deployed and reachable" >&2
    exit 1
fi

SUBMISSIONS_JSONL="${OUTDIR}/submissions.jsonl"
SUBMISSIONS_CSV="${OUTDIR}/submissions.csv"

SUBMISSIONS_IN_FILE="$(mktemp)"
printf '%s' "${SUBMISSIONS_JSON}" > "${SUBMISSIONS_IN_FILE}"

python3 - "${SUBMISSIONS_IN_FILE}" "${SUBMISSIONS_JSONL}" "${SUBMISSIONS_CSV}" <<'PYEOF'
import csv
import json
import sys

in_path, jsonl_path, csv_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(in_path) as f:
    entries = json.load(f)

fieldnames = [
    "timestamp",
    "question",
    "winner",
    "with_skills_arm",
    "winner_had_skills",
    "skills_loaded",
    "snapshot_sha",
    "why",
    "answer_a",
    "answer_b",
]

with_skills = 0
without_skills = 0
ties = 0
timestamps = []

with open(jsonl_path, "w") as jsonl_f, open(csv_path, "w", newline="") as csv_f:
    writer = csv.DictWriter(csv_f, fieldnames=fieldnames)
    writer.writeheader()
    for entry in entries:
        jsonl_f.write(json.dumps(entry) + "\n")

        payload = entry.get("jsonPayload", {}) or {}
        timestamp = entry.get("timestamp", "")
        if timestamp:
            timestamps.append(timestamp)

        winner = payload.get("winner", "")
        with_skills_arm = payload.get("withSkillsArm", "")
        if winner == with_skills_arm:
            winner_had_skills = "with_skills"
            with_skills += 1
        elif winner == "tie":
            winner_had_skills = "tie"
            ties += 1
        else:
            winner_had_skills = "without_skills"
            without_skills += 1

        skills_loaded = payload.get("skillsLoaded") or []
        if isinstance(skills_loaded, list):
            skills_loaded_str = ";".join(str(s) for s in skills_loaded)
        else:
            skills_loaded_str = str(skills_loaded)

        answers = payload.get("answers", {}) or {}

        writer.writerow({
            "timestamp": timestamp,
            "question": payload.get("question", ""),
            "winner": winner,
            "with_skills_arm": with_skills_arm,
            "winner_had_skills": winner_had_skills,
            "skills_loaded": skills_loaded_str,
            "snapshot_sha": payload.get("snapshotSha", ""),
            "why": payload.get("why", ""),
            "answer_a": answers.get("a", ""),
            "answer_b": answers.get("b", ""),
        })

count = len(entries)
date_range = f"{min(timestamps)} to {max(timestamps)}" if timestamps else "unknown"

print("")
print(f"Submissions found: {count}")
print(f"Date range: {date_range}")
print(f"Win split: with-skills {with_skills}, without-skills {without_skills}, ties {ties}")
PYEOF
rm -f "${SUBMISSIONS_IN_FILE}"

echo "" >&2
echo "Wrote ${SUBMISSIONS_JSONL}" >&2
echo "Wrote ${SUBMISSIONS_CSV}" >&2

if [[ "${INCLUDE_COMPARE}" -eq 1 ]]; then
    echo "" >&2
    echo "Fetching skill_review_compare entries (questions asked without a rating)..." >&2
    COMPARE_JSON="$(fetch_log_entries "skill_review_compare")"
    COMPARE_COUNT="$(printf '%s' "${COMPARE_JSON}" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"

    if [[ "${COMPARE_COUNT}" -eq 0 ]]; then
        echo "No skill_review_compare entries found in the last ${DAYS} day(s). Not fatal: this just" >&2
        echo "means every comparison so far was followed by a rated submission." >&2
    else
        COMPARE_JSONL="${OUTDIR}/compare.jsonl"
        COMPARE_CSV="${OUTDIR}/compare.csv"

        COMPARE_IN_FILE="$(mktemp)"
        printf '%s' "${COMPARE_JSON}" > "${COMPARE_IN_FILE}"

        python3 - "${COMPARE_IN_FILE}" "${COMPARE_JSONL}" "${COMPARE_CSV}" <<'PYEOF'
import csv
import json
import sys

in_path, jsonl_path, csv_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(in_path) as f:
    entries = json.load(f)

fieldnames = [
    "timestamp",
    "question",
    "snapshot_sha",
    "a_tool_calls",
    "a_error",
    "a_truncated",
    "b_tool_calls",
    "b_error",
    "b_truncated",
]

timestamps = []

with open(jsonl_path, "w") as jsonl_f, open(csv_path, "w", newline="") as csv_f:
    writer = csv.DictWriter(csv_f, fieldnames=fieldnames)
    writer.writeheader()
    for entry in entries:
        jsonl_f.write(json.dumps(entry) + "\n")

        payload = entry.get("jsonPayload", {}) or {}
        timestamp = entry.get("timestamp", "")
        if timestamp:
            timestamps.append(timestamp)

        a = payload.get("a", {}) or {}
        b = payload.get("b", {}) or {}

        writer.writerow({
            "timestamp": timestamp,
            "question": payload.get("question", ""),
            "snapshot_sha": payload.get("snapshotSha", ""),
            "a_tool_calls": a.get("toolCalls", ""),
            "a_error": a.get("error", ""),
            "a_truncated": a.get("truncated", ""),
            "b_tool_calls": b.get("toolCalls", ""),
            "b_error": b.get("error", ""),
            "b_truncated": b.get("truncated", ""),
        })

count = len(entries)
date_range = f"{min(timestamps)} to {max(timestamps)}" if timestamps else "unknown"

print("")
print(f"Compare-only entries found: {count}")
print(f"Date range: {date_range}")
PYEOF
        rm -f "${COMPARE_IN_FILE}"
        echo "" >&2
        echo "Wrote ${COMPARE_JSONL}" >&2
        echo "Wrote ${COMPARE_CSV}" >&2
    fi
fi
