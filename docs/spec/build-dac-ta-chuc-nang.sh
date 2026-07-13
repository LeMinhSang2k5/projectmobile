#!/usr/bin/env bash
# Build PDF từ Dac_Ta_Chuc_Nang_App_30ngaysaumui.md (Pandoc + XeLaTeX + font tiếng Việt)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MD_FILE="Dac_Ta_Chuc_Nang_App_30ngaysaumui.md"
PDF_FILE="Dac_Ta_Chuc_Nang_App_30ngaysaumui.pdf"
TEMPLATE="latex/chuc-nang-template.tex"

for cmd in pandoc xelatex; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Thiếu: $cmd (cài: brew install pandoc && brew install --cask mactex-no-gui)"
    exit 1
  fi
done

echo "=== Build $PDF_FILE ==="

pandoc "$MD_FILE" \
  --from markdown \
  --to pdf \
  --pdf-engine=xelatex \
  --template="$TEMPLATE" \
  --toc \
  --toc-depth=3 \
  --number-sections \
  --shift-heading-level-by=-1 \
  --metadata title="Tài liệu Đặc tả Chức năng — FitLife" \
  --metadata author="FitLife" \
  --metadata date="$(date '+%d/%m/%Y')" \
  --variable toc-title="Mục lục" \
  -o "$PDF_FILE"

echo "Xong: $SCRIPT_DIR/$PDF_FILE ($(du -h "$PDF_FILE" | cut -f1))"
