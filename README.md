# Diff Reviewer

A macOS desktop app for reviewing GitHub PR diffs with line-level commenting. Built with Electron and [diff2html](https://github.com/rtfpessoa/diff2html).

## Install

```bash
cd ~/Repos/diff-reviewer
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

- **Side-by-side diff** with syntax highlighting (diff2html)
- **Line-level commenting** — hover any line, click `+` to add a comment
- **Both sides** — comment on old (left) and new (right) code
- **Multiple comments per line** — add as many comments as needed on the same line
- **@Hermes tag** — start a comment with `@Hermes` (or your configured prefix) to send it directly to the AI agent instead of including it in the PR review
- **Edit/Delete** — edit or delete any comment after submitting
- **Review actions** — Approve, Request Changes, or Comment
- **File list** — scrollable, collapses automatically for large PRs
- **Dark theme** matching GitHub's dark mode
- **Drag & drop** — drop `.diff` files onto the window
- **Keyboard shortcuts** — `Cmd+Enter` to submit comment, `Esc` to cancel

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
5. Add multiple comments per line, tag with `@Hermes` for AI messages
6. Edit or delete any comment
7. Add an optional review summary
8. Click **Approve**, **Request Changes**, or **Comment** to submit

On submit, the app:
- Saves PR comments as JSON to the configured `reviewSaveDir`
- Sends `@Hermes`-tagged messages to the AI agent via CLI
- Sends a summary notification to the AI agent

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
      "text": "Use a class selector instead of attribute selector."
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
