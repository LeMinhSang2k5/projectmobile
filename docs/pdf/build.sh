#!/usr/bin/env bash
# Build PDF tu dac_ta_ky_thuat_de_hieu.md bang Pandoc + XeLaTeX
# Chen so do UML (TikZ) tu latex/diagrams/*.tex
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MD_FILE="dac_ta_ky_thuat_de_hieu.md"
PDF_FILE="dac_ta_ky_thuat_de_hieu.pdf"
TEMPLATE="latex/template.tex"
BUILD_DIR="latex/build"
BUILD_MD="$BUILD_DIR/doc.md"
DIAGRAM_DIR="latex/diagrams"

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo "Thieu: $1"
  else
    echo "OK $1: $(command -v "$1")"
  fi
}

embed_diagram() {
  local key="$1"
  local caption="$2"
  local file="$DIAGRAM_DIR/${key}.tex"
  if [[ ! -f "$file" ]]; then
    echo "Khong tim thay so do: $file"
    exit 1
  fi
  cat <<EOF
\`\`\`{=latex}
\begin{figure}[H]
\centering
\resizebox{0.98\\textwidth}{!}{%
$(cat "$file")
}
\caption{${caption}}
\end{figure}
\`\`\`
EOF
}

echo "=== Kiem tra cong cu build ==="
require_cmd pandoc
require_cmd xelatex

if ! command -v pandoc &>/dev/null || ! command -v xelatex &>/dev/null; then
  echo "Can cai pandoc va MacTeX (xelatex)"
  exit 1
fi

mkdir -p "$BUILD_DIR"

echo ""
echo "=== Chen so do UML vao markdown ==="
cp "$MD_FILE" "$BUILD_MD"

replace_diagram() {
  local placeholder="$1"
  local key="$2"
  local caption="$3"
  local tmp
  tmp="$(mktemp)"
  embed_diagram "$key" "$caption" > "$tmp"
  # macOS sed: replace placeholder line with diagram block
  sed "/^${placeholder}\$/r $tmp" "$BUILD_MD" | sed "/^${placeholder}\$/d" > "${BUILD_MD}.next"
  mv "${BUILD_MD}.next" "$BUILD_MD"
  rm -f "$tmp"
}

replace_diagram "%%DIAGRAM:use-case%%" "use-case" "Sơ đồ Use Case — module Dashboard, Notification \\& Badges"
replace_diagram "%%DIAGRAM:activity-ad1%%" "activity-ad1" "Sơ đồ hoạt động AD1 — Mở app và tải Dashboard"
replace_diagram "%%DIAGRAM:activity-ad2%%" "activity-ad2" "Sơ đồ hoạt động AD2 — Hoàn thành buổi tập"
replace_diagram "%%DIAGRAM:activity-ad3%%" "activity-ad3" "Sơ đồ hoạt động AD3 — Bật nhắc uống nước"
replace_diagram "%%DIAGRAM:activity-ad4%%" "activity-ad4" "Sơ đồ hoạt động AD4 — Bật nhắc tập luyện"
replace_diagram "%%DIAGRAM:activity-ad5%%" "activity-ad5" "Sơ đồ hoạt động AD5 — Đồng bộ huy hiệu"

echo ""
echo "=== Dang build PDF ==="
echo "Input:  $BUILD_MD"
echo "Output: $PDF_FILE"
echo ""

pandoc "$BUILD_MD" \
  --from markdown \
  --to pdf \
  --pdf-engine=xelatex \
  --template="$TEMPLATE" \
  --syntax-highlighting=idiomatic \
  --toc \
  --shift-heading-level-by=-1 \
  --toc-depth=3 \
  --number-sections \
  --metadata title="Tài liệu Giải thích Module Dashboard, Notification và Badges" \
  --metadata author="FitLife — Người 4" \
  --metadata date="$(date '+%d/%m/%Y')" \
  --variable toc-title="Mục lục" \
  -o "$PDF_FILE"

rm -f "${PDF_FILE%.pdf}.tex" 2>/dev/null || true

if [[ -f "$PDF_FILE" ]]; then
  SIZE=$(du -h "$PDF_FILE" | cut -f1)
  echo ""
  echo "Build thanh cong: $SCRIPT_DIR/$PDF_FILE ($SIZE)"
else
  echo "Build that bai"
  exit 1
fi
