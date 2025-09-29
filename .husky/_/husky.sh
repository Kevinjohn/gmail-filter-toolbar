#!/bin/sh
# shellcheck shell=sh

if [ -z "$husky_skip_init" ]; then
  husky_dir="$(dirname "$0")"
  husky_root="$(cd "$husky_dir/.." && pwd)"
  export PATH="$husky_root/node_modules/.bin:$PATH"
  export HUSKY=1
  cd "$husky_root" || exit 1
fi
