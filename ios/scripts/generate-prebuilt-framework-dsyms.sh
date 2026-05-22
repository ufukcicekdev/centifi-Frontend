#!/bin/bash
# Ensures dSYMs exist for prebuilt RN/Hermes frameworks in Release archives.
# Fixes Xcode "Upload Symbols Failed" for React, ReactNativeDependencies, hermesvm.
set -euo pipefail

if [[ "${CONFIGURATION:-}" != "Release" ]]; then
  exit 0
fi

FRAMEWORKS_DIR="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
DSYM_DIR="${DWARF_DSYM_FOLDER_PATH}"
mkdir -p "${DSYM_DIR}"

ensure_dsym() {
  local fw_name="$1"
  local binary_name="$2"
  local embedded="${FRAMEWORKS_DIR}/${fw_name}.framework/${binary_name}"
  local dsym_out="${DSYM_DIR}/${fw_name}.framework.dSYM"

  if [[ ! -f "${embedded}" ]]; then
    echo "[Centifi dSYM] Skip ${fw_name}: embedded binary not found"
    return 0
  fi

  local bin_uuids dsym_uuids
  bin_uuids="$(dwarfdump --uuid "${embedded}" 2>/dev/null | awk '{print $2}' | sort | tr '\n' ' ' | xargs)"

  if [[ -d "${dsym_out}" ]]; then
    dsym_uuids="$(dwarfdump --uuid "${dsym_out}" 2>/dev/null | awk '{print $2}' | sort | tr '\n' ' ' | xargs)"
    if [[ -n "${bin_uuids}" && "${bin_uuids}" == "${dsym_uuids}" ]]; then
      echo "[Centifi dSYM] ${fw_name} dSYM OK (UUID match)"
      return 0
    fi
    echo "[Centifi dSYM] ${fw_name} dSYM UUID mismatch; regenerating"
    rm -rf "${dsym_out}"
  fi

  local pod_dsym=""
  pod_dsym="$(find "${PODS_ROOT}" -type d -name "${fw_name}.framework.dSYM" 2>/dev/null | head -n 1 || true)"
  if [[ -n "${pod_dsym}" ]]; then
    dsym_uuids="$(dwarfdump --uuid "${pod_dsym}" 2>/dev/null | awk '{print $2}' | sort | tr '\n' ' ' | xargs)"
    if [[ -n "${bin_uuids}" && "${bin_uuids}" == "${dsym_uuids}" ]]; then
      cp -R "${pod_dsym}" "${dsym_out}"
      echo "[Centifi dSYM] Copied ${fw_name} from Pods"
      return 0
    fi
  fi

  dsymutil "${embedded}" -o "${dsym_out}"
  echo "[Centifi dSYM] Generated ${fw_name} with dsymutil"
}

ensure_dsym "hermesvm" "hermesvm"
ensure_dsym "React" "React"
ensure_dsym "ReactNativeDependencies" "ReactNativeDependencies"
