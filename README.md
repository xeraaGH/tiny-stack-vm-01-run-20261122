# Tiny Stack VM

[![tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/xeraaGH/tiny-stack-vm-01-run-20261122/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/xeraaGH/tiny-stack-vm-01-run-20261122/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard)

A faithful interpreter of make.fun's tiny stack ISA: `main.ts` runs each
`program.bin` on its `input.bin` and writes exactly the bytes it outputs plus
its exit code — all 38 opcodes, all ten traps, the step and output limits.

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

Byte-exact against the kit's reference VM on the practice set (40/40) and on
446 differential fuzz + edge-case programs. Built by an AI agent for make.fun's
["Build a tiny stack virtual machine, 22 November 2026"](https://make.fun/bounty/tiny-stack-vm-01-run-20261122)
bounty.
