# Diff Reviewer Test Cases

## 1. App Launch & Empty State
- [ ] App launches without errors
- [ ] Empty state shows "Click 'Open Diff' or drag a .diff file to begin"
- [ ] Review buttons (Comment, Request Changes, Approve) are hidden when no diff loaded
- [ ] PR info shows "No diff loaded"
- [ ] Open Diff button is visible and clickable

## 2. File Loading
- [ ] Click "Open Diff" opens file dialog
- [ ] File dialog filters for .diff and .patch files
- [ ] Loading a valid .diff file renders the diff
- [ ] Loading a large .diff file (1000+ lines) renders without freezing
- [ ] Loading an empty .diff file shows appropriate message
- [ ] Loading a file with no changes (only context) renders correctly
- [ ] Drag and drop a .diff file loads it
- [ ] Drag and drop a non-.diff file is rejected or shows error
- [ ] Opening app with file argument loads the diff automatically

## 3. Diff Rendering
- [ ] Side-by-side view shows left (old) and right (new) panels
- [ ] File list shows all changed files
- [ ] File names are correct and clickable to scroll
- [ ] Added lines show green background
- [ ] Removed lines show red background
- [ ] Context lines (unchanged) show correctly
- [ ] Syntax highlighting works for Perl (.pm, .cgi)
- [ ] Syntax highlighting works for JavaScript (.js)
- [ ] Syntax highlighting works for templates (.tpl)
- [ ] Line numbers display correctly on both sides
- [ ] Diff handles binary file markers
- [ ] Diff handles rename/copy markers
- [ ] Diff handles files with only additions (no removals)
- [ ] Diff handles files with only removals (no additions)
- [ ] Diff handles files with no newline at end marker

## 4. Comment Functionality
- [ ] Hovering over a LEFT side line shows the + comment button
- [ ] Hovering over a RIGHT side line shows the + comment button
- [ ] Clicking + on left side opens comment dialog
- [ ] Clicking + on right side opens comment dialog
- [ ] Comment dialog appears near the clicked line
- [ ] Comment dialog has a textarea
- [ ] Comment dialog has Cancel and Add Comment buttons
- [ ] Typing in textarea works
- [ ] Clicking Cancel closes dialog without saving
- [ ] Clicking Add Comment saves and shows marker on the line
- [ ] Pressing Escape closes dialog
- [ ] Pressing Cmd+Enter submits comment
- [ ] Comment marker shows "You:" prefix and comment text
- [ ] Multiple comments on same file work
- [ ] Comments on different files work
- [ ] Comment on first line of file works
- [ ] Comment on last line of file works
- [ ] Comment on context line (unchanged) works
- [ ] Comment on added line works
- [ ] Comment on removed line works
- [ ] Empty comment (whitespace only) is rejected
- [ ] Very long comment text wraps properly

## 5. Review Submission
- [ ] "Comment" button submits review with type=comment
- [ ] "Request Changes" button submits review with type=request_changes
- [ ] "Approve" button submits review with type=approve
- [ ] Review body textarea is included in submission
- [ ] All line comments are included in submission
- [ ] Review is saved to /tmp/diff-review-pending.json
- [ ] Saved JSON has correct structure: { type, body, comments, timestamp }
- [ ] Each comment has { file, line, side, text }
- [ ] After submit, buttons are disabled
- [ ] After submit, PR info shows saved file path
- [ ] Submitting with no comments and no body still works

## 6. UI/UX
- [ ] Dark theme applies consistently
- [ ] Top bar stays fixed when scrolling
- [ ] Comment dialog doesn't overflow viewport
- [ ] Diff scrolls smoothly with many files
- [ ] File list scrolls independently if needed
- [ ] Button hover states work
- [ ] Text is readable (contrast)
- [ ] No visual glitches on resize

## 7. Edge Cases
- [ ] Diff with single file works
- [ ] Diff with 50+ files works
- [ ] Diff with very long lines (500+ chars) doesn't break layout
- [ ] Diff with special characters (unicode, emojis) renders
- [ ] Diff with tabs renders correctly
- [ ] Loading a new diff replaces the old one
- [ ] Commenting after loading a new diff works (old comments cleared)
