# Contributing to PR Reviewer

Thanks for your interest in contributing! This project is open source and welcomes pull requests.

## Getting Started

1. Fork this repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/diff-reviewer.git
   cd diff-reviewer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. Make your changes
6. Run the tests:
   ```bash
   npm test
   ```
7. Commit and push:
   ```bash
   git commit -m "Add your feature"
   git push origin feature/your-feature-name
   ```
8. Open a pull request

## Pull Request Guidelines

- **One feature per PR** — keep changes focused
- **Describe what changed and why** in the PR description
- **Run the test suite** before submitting (`npm test`)
- **Add tests** for new features if possible
- **Update README.md** if adding new features or changing usage

## Project Structure

```
diff-reviewer/
├── main.js          # Electron main process, IPC handlers, AI CLI integration
├── preload.js       # IPC bridge between main and renderer
├── renderer.js      # All UI logic: diff rendering, comments, shortcuts, auto-save
├── index.html       # UI layout, CSS styles
├── config.json      # Default configuration (AI command, tag prefix, save dir)
├── test.js          # Automated test suite (run with: npx electron test.js <diff>)
├── README.md        # Usage documentation
└── package.json     # Dependencies and metadata
```

## Adding New Features

### Adding a new comment level

1. Add the UI element in `index.html` (CSS + HTML structure)
2. Add the click handler in `renderer.js` (e.g., `openFileCommentDialog()`)
3. Add a render function for restoring from draft (e.g., `renderFileCommentMarker()`)
4. Update `submitComment()` to handle the new level
5. Update `editComment()` and `deleteComment()` for the new level
6. Call `autoSaveDraft()` after every change

### Adding new keyboard shortcuts

1. Add the shortcut in the `document.addEventListener('keydown', ...)` handler in `renderer.js`
2. Add a `title` attribute on the corresponding button with the shortcut text
3. Add a `<span class="shortcut-hint">` if the shortcut applies to a non-button element

### Extending the AI integration

1. Update `config.json` with new fields
2. Update `loadConfig()` in `main.js` to read the new fields
3. Update `get-config` IPC handler to expose them
4. Update `getConfig()` call in `renderer.js` to use them

## Testing

The test suite runs inside Electron (not Node.js) because it needs the DOM:

```bash
# Generate a test diff
cd /path/to/your/repo
git diff HEAD~1 > /tmp/test.diff

# Run tests
cd ~/Repos/diff-reviewer
npx electron test.js /tmp/test.diff
```

## Code Style

- Use `camelCase` for variables and functions
- Use descriptive names (no single-letter variables in complex logic)
- Keep functions focused — one purpose per function
- Use `const` and `let`, never `var`
- No inline styles in HTML — use CSS classes

## Reporting Issues

Open an issue with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshot if it's a visual bug
- Your OS and Electron version
