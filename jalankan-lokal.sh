#!/bin/sh
cd "$(dirname "$0")"
echo "Buka http://localhost:8080  (Ctrl+C untuk berhenti)"
(sleep 1; (command -v open >/dev/null && open http://localhost:8080) || (command -v xdg-open >/dev/null && xdg-open http://localhost:8080)) 2>/dev/null &
python3 -m http.server 8080
