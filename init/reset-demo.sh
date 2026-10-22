#!/usr/bin/env bash
# Clears demo stories, access requests and log entries from data/db.json, KEEPING the signed
# corpus policies (signing them needs the council's enclave approval). Backup: data/db.backup.json
# Usage: bash init/reset-demo.sh     (then press F5 in the app)
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
[[ -f data/db.json ]] || { echo "No data/db.json yet: nothing to reset."; exit 0; }
cp data/db.json data/db.backup.json
node -e '
const fs = require("fs"); const p = "data/db.json"; const db = JSON.parse(fs.readFileSync(p, "utf8"));
db.stories = []; db.accessRequests = []; db.audit = (db.audit || []).filter(a => a.action === "policy.sign");
fs.writeFileSync(p, JSON.stringify(db, null, 2));
console.log("Reset done:", { stories: 0, accessRequests: 0, policies: (db.policies || []).length });'
