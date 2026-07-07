#!/usr/bin/env bash
# Build PDF — chạy script trong thư mục pdf/
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/pdf/build.sh"
