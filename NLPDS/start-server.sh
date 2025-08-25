#!/bin/bash
# This script ensures the server starts in the correct project directory.
echo "Starting server in the NLPDS directory..."
cd "$(dirname "$0")" && python3 -m http.server 8000
echo "Server running at http://localhost:8000"
