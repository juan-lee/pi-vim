# AGENTS.md

This repo is not expected, for now, to be imported as a dependency; treat exported internals as pi-vim-local unless documented otherwise.

For every new or changed Vim-like feature, add curated nvim parity coverage in `test/nvim-parity.ts` unless the behavior is intentionally not Vim-compatible. If it is an intentional divergence, make that explicit in tests and documentation.
