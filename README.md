# Diff Reviewer

A macOS desktop app for reviewing GitHub PR diffs with line-level commenting, file-level comments, auto-save, and AI agent integration. Built with Electron and [diff2html](https://github.com/rtfpessoa/diff2html).

## Install

```bash
git clone https://github.com/webtoolbox/diff-reviewer.git
cd diff-reviewer
npm install
```

## Usage

```bash
# Basic — open a diff file
npx electron . /path/to/file.diff

# With AI agent integration
npx electron . \
  --chat-id "telegram:Sandeep / topic 16039" \
  --pr-number 6690 \
  /tmp/pr-6690-clean.diff
```

### Command-Line Options

| Flag | Description |
|------|-------------|
| `--chat-id <target>` | Chat target for AI agent notifications on submit |
| `--pr-number <n>` | Pre-fill the PR number. Also auto-detected from filename |

## Configuration

Edit `config.json` to customize the AI agent integration:

```json
{
  "aiCommand": "hermes",
  "aiSendArgs": ["send", "--to"],
  "aiChatId": null,
  "aiTagPrefix": "@Hermes",
  "reviewSaveDir": "~/.hermes/profiles/wt/diff-reviews/pending"
}
```

| Field | Description |
|-------|-------------|
| `aiCommand` | CLI command for the AI agent (e.g., `hermes`, `claude`, `cursor`) |
| `aiSendArgs` | Arguments before the chat-id and message |
| `aiChatId` | Default chat target (overridden by `--chat-id`) |
| `aiTagPrefix` | Tag prefix that triggers AI messages (e.g., `@Hermes`, `@Claude`) |
| `reviewSaveDir` | Directory for saved review JSON files |

## Features

### Commenting
- **Line-level comments** — hover any line, click `+` to add a comment
- **File-level comments** — click the 💬 button on any file header
- **Multiple comments per line** — add as many comments as needed on the same line
- **Both sides** — comment on old (left) and new (right) code
- **Edit/Delete** — edit or delete any comment after submitting

### AI Integration
- **@Hermes tag** — start a comment with `@Hermes` (or your configured prefix) to send it directly to the AI agent
- **Configurable CLI** — works with any AI agent (Hermes, Claude, Cursor, etc.)
- **Excluded from review** — @Hermes-tagged comments are sent to AI, not included in PR review

### Auto-Save & Resume
- **Auto-save on every change** — comments are saved to a draft file automatically
- **Resume on restart** — reopen the same diff file and your comments are restored
- **Crash-safe** — if the app crashes or computer restarts, your work is preserved

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+A` | Approve PR |
| `Cmd+Shift+R` | Request Changes |
| `Cmd+Shift+C` | Submit as Comment |
| `Cmd+Enter` | Submit current comment form |
| `Cmd+Shift+Enter` | Submit review (when no comment form open) |
| `Esc` | Cancel/close comment form |

All buttons show their shortcut keys in tooltips on hover.

### UI
- **Side-by-side diff** with syntax highlighting (diff2html)
- **Dark theme** matching GitHub's dark mode
- **Scrollable file list** — collapses automatically for large PRs
- **Drag & drop** — drop `.diff` files onto the window
- **Inline comment forms** — appear between lines, never block code
- **File-level comment button** — 💬 on each file header with comment count badge

## @Hermes Tag

When you start a comment with `@Hermes` (or whatever `aiTagPrefix` is set to in `config.json`):

1. The comment is **sent to the AI agent** via the configured CLI command
2. The comment is **excluded from the PR review** — it won't be saved in the review JSON
3. The comment shows a **purple badge** in the UI to indicate it's an AI message
4. You can use this to ask questions, request explanations, or get suggestions from the AI

Example: `@Hermes Why was this change needed?` sends the question to the AI agent.

## How It Works

1. Open a `.diff` or `.patch` file in the app
2. Browse the side-by-side diff with syntax highlighting
3. Hover over any line to reveal the `+` comment button
4. Click to add a comment — form appears inline between lines
5. Click the 💬 on a file header to add a file-level comment
6. Add multiple comments per line, tag with `@Hermes` for AI messages
7. Edit or delete any comment
8. Add an optional review summary
9. Use keyboard shortcuts or click **Approve**, **Request Changes**, or **Comment** to submit

On submit, the app:
- Saves PR comments as JSON to the configured `reviewSaveDir`
- Sends `@Hermes`-tagged messages to the AI agent via CLI
- Sends a summary notification to the AI agent
- Deletes the draft file (review is complete)

## Review JSON Format

```json
{
  "type": "request_changes",
  "prNumber": 6690,
  "body": "Overall review comment",
  "comments": [
    {
      "file": "modules/Members/Pages.pm",
      "line": "42",
      "side": "RIGHT",
      "text": "Use a class selector instead of attribute selector.",
      "level": "line"
    },
    {
      "file": "modules/Members/Pages.pm",
      "line": null,
      "side": null,
      "text": "This file needs refactoring.",
      "level": "file"
    }
  ],
  "timestamp": "2026-07-21T07:44:33.089Z"
}
```

Note: `@Hermes`-tagged comments are filtered out before saving.

## Testing

```bash
# Run the automated test suite (36 tests)
npx electron test.js /path/to/test.diff
```

## Dependencies

- [Electron](https://www.electronjs.org/) — desktop app framework
- [diff2html](https://github.com/rtfpessoa/diff2html) — diff parsing and rendering

## Contributing

We welcome pull requests! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
