#!/usr/bin/env bash
# Screenshot a lab page (wraps scripts/shot.mjs, which drives headless Chrome over CDP).
# Usage: scripts/shot.sh <route> <out.png> [light|dark] [width] [height] [waitMs] [--full]
# e.g.   scripts/shot.sh /lab/tremor C:/tmp/tremor.png dark 1440 900
# Phone widths work (390x844). --full captures the whole scrolling page.
# MSYS_NO_PATHCONV stops Git Bash rewriting "/lab/x" into a Windows path.
MSYS_NO_PATHCONV=1 node "$(dirname "$0")/shot.mjs" "$@"
