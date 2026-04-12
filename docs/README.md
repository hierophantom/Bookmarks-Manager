# Docs Folder

This folder contains documentation and local tooling that support Bookmark Manager releases.

## Changelog workflow

1. Update CHANGELOG.md using the version format:
   - ## Version heading
   - Tags: #tag_a, #tag_b
   - Summary: One paragraph summary
   - ### Added / Improved / Fixed
   - - Item title: Item description
2. Open changelog-visualizer.html in a browser.
3. Confirm each version renders its title, tags, summary, and grouped lists.

## Files

- CHANGELOG.md: canonical changelog source used by release messaging.
- changelog-visualizer.html: visual presentation layer for the markdown changelog.
- changelog-visualizer.css: visual styling for the changelog page.
- changelog-visualizer.js: markdown parser and renderer.
