# nvim parity lab

Use this lab to compare real Neovim with the local `pi-vim` extension before turning an observation into a curated parity test.

This is a discovery workflow, not the regression gate. The durable gate is `npm run test:nvim`.

## quick parity gate

```bash
npm run test:nvim  # all curated nvim parity cases
```

The gate is separate from `npm test` and `npm run check` while the parity corpus is young.

## feature workflow

Every new or changed Vim-like feature should add curated nvim parity coverage in `test/nvim-parity*.ts`, unless the behavior is intentionally not Vim-compatible. Intentional divergences need explicit tests and documentation.

## cmux side-by-side lab

Requires running inside cmux:

```bash
[ -n "$CMUX_WORKSPACE_ID" ] \
  && [ -n "$CMUX_SURFACE_ID" ] \
  && command -v cmux >/dev/null 2>&1
```

Create two panes anchored on the current surface:

```bash
ctx=$(cmux identify --json)
workspace=$(printf '%s' "$ctx" | jq -er '.caller.workspace_ref')
surface=$(printf '%s' "$ctx" | jq -er '.caller.surface_ref')

nvim_out=$(cmux new-split right \
  --workspace "$workspace" \
  --surface "$surface" \
  --focus false)
nvim_surface=$(printf '%s\n' "$nvim_out" \
  | awk '{for (i=1;i<=NF;i++) if ($i ~ /^surface:[0-9]+$/) print $i}' \
  | head -n 1)

pi_out=$(cmux new-split down \
  --workspace "$workspace" \
  --surface "$nvim_surface" \
  --focus false)
pi_surface=$(printf '%s\n' "$pi_out" \
  | awk '{for (i=1;i<=NF;i++) if ($i ~ /^surface:[0-9]+$/) print $i}' \
  | head -n 1)
```

Launch Neovim with a visible cursor/status baseline:

```bash
nvim_cmd='printf hello > /tmp/pi-vim-compare.txt && nvim -Nu NONE -n /tmp/pi-vim-compare.txt +"set ruler laststatus=2 statusline=NVIM\\ %l,%c" +"normal! 0"'
cmux send --workspace "$workspace" --surface "$nvim_surface" -- "$nvim_cmd"
cmux send-key --workspace "$workspace" --surface "$nvim_surface" enter
```

Launch Pi with only the local extension:

```bash
pi_cmd="cd $(printf '%q' "$PWD") && pi --no-session --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files -e $(printf '%q' "$PWD/index.ts")"
cmux send --workspace "$workspace" --surface "$pi_surface" -- "$pi_cmd"
cmux send-key --workspace "$workspace" --surface "$pi_surface" enter
```

Drive panes with explicit routing:

```bash
# printable input
cmux send --workspace "$workspace" --surface "$nvim_surface" -- '$'
cmux send --workspace "$workspace" --surface "$pi_surface" -- '$'

# special keys
cmux send-key --workspace "$workspace" --surface "$pi_surface" escape

# observe
cmux read-screen --workspace "$workspace" --surface "$nvim_surface" --lines 20
cmux read-screen --workspace "$workspace" --surface "$pi_surface" --lines 40
```

Rules of thumb:

- Use `cmux send` for printable characters such as `$` and `x`.
- Use `cmux send-key` for special keys such as `escape` and `enter`.
- Keep Pi isolated with the `--no-*` flags above so package notices, skills, and other extensions do not obscure the prompt.
- Treat cmux as the microscope. Once you find a discrepancy, add a curated case to `test/nvim-parity*.ts`.
