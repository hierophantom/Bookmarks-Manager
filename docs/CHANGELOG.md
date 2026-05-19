# Changelog

All notable changes to Journey are documented in this file.

## v0.4.0 - 2026-05-19

Tags: #Organization, #Workflows, #Sessions, #QOL
Summary: V0.4.0 introduces powerful organization controls, faster workflows, and a dedicated session view—giving you complete command over your browsing.

### Added
- Folder Customization: Add custom emojis and colors to folders for visual organization that reflects how you think
- Bulk Actions: Select multiple bookmarks and move, delete, or tag them all at once
- This Session Page: Dedicated view showing all currently open tabs with tab group visualization, filtering, and save-as-journey
- Right-Click Context Menu: Quick access to open, copy URL, edit, or delete bookmarks without leaving the view
- Browser History Suggestions: Auto-complete bookmark URLs from your own browsing history
- Quick Links Pre-Population: First launch auto-seeds Quick Links from your top sites
- Version Update Prompts: In-app notifications when new extension versions are available
- Undo on All Actions: Snackbar recovery for any bookmark or folder change

### Improved
- Folder Collapse/Expand: Collapse individual or all folders with one click; state persists between sessions
- Keyboard Navigation: Arrow-key navigation through search results for power users (+ Enter to open)
- Link Behavior Control: Choose whether links open in current tab or new tab (Settings > Look & Feel)
- Bookmarks Bar: Cleaner spacing and visual separation for easier scanning
- Selection Components: Updated multi-select UI with counters and better affordances
- Unsplash Image Details: Image descriptions now displayed in photo attribution modals
- Sort Selection Persistence: Your chosen sort order is remembered between sessions
- Header Backdrop Toggle: New customization option in Settings > Look & Feel

### Fixed
- "Open" Context Menu: Now correctly opens in current tab instead of new tab
- Security & Performance: Improved inline style sanitization, removed debug logging, better resource handling

Organize your bookmarks exactly the way you think. Emojis and colors let you build a folder structure that makes sense to you, and bulk operations mean you can manage dozens of bookmarks in seconds instead of wrestling with them one by one. Your reading system should adapt to you, not the other way around.

See everything at a glance with the new This Session page. Watch your current tabs organize themselves by group, save entire browsing sessions as journeys, and never lose track of what you had open again. It's like having a visual memory of your work.

Power users get keyboard shortcuts that finally work the way they should. Arrow through search results, collapse folders with a keystroke, choose how links open. Journey gets out of your way and lets you work at the speed of thought.

Made a mistake? Undo it instantly. Changed your mind about how to organize? Your preferences stay saved, so Journey works the same way every single time. Work without regret, and let the extension grow with you, not against you.

## v0.2.0 - 2026-04-12

Tags: #Journey_dashboard, #Search_upgrade, #QOL_YOLO
Summary: V2 introduces a visual Journey workflow, a clearer Info menu and in-app changelog experience, stronger search discoverability, and smoother everyday navigation quality.

### Added
- Journey Workspace: Added a dedicated Journey page with origin lists, node maps, and a visual canvas to trace user flows.
- Component Library Growth: Added reusable journey components including origin items and journey node cards.
- In-App Changelog Surface: Added a changelog modal in main UI plus markdown-based changelog source and renderer utilities.

### Improved
- Search Overlay Discoverability: Improved top bar search affordance and keyboard-first access from the extension page.
- Theme Controls: Improved theme customization and background personalization workflows.
- Info Menu Experience: Replaced About-only trigger with an Info entry point backed by Shelf menu components and improved hover/focus states.

### Fixed
- Scroll Preservation: Fixed bookmark page rerender behavior so scroll position remains stable during updates.
- Changelog Content Clarity: Improved changelog item readability with explicit item titles and selectable text.

### Customer Story
- Browse Your Way Through Journeys: You can now see how your browsing paths connect in one visual workflow instead of reconstructing them mentally from raw tabs and folders.
- Understand What Changed Without Leaving the App: Release updates now live directly inside Journey, making it easy to stay current in context.
- Faster Daily Flow: Search and navigation affordances are clearer, so common actions are easier to discover and repeat.
- More Predictable Interaction Quality: Scroll stability and improved interaction polish reduce friction in frequent browsing and organization sessions.

## v0.1.0 - 2025-12-18

Tags: #Core_release, #Bookmark_flow, #Themes
Summary: V1 established the core Journey experience: structured bookmark browsing, flexible tagging, customizable homepage widgets, and first-wave visual personalization.

### Added
- Bookmark Core: Added bookmark browsing, section rendering, and folder-aware navigation.
- Tagging System: Added tag creation, assignment, and filtering flows for faster organization.
- Homepage Widgets: Added homepage widget slots with add, arrange, and remove support.
- Theme Presets: Added multiple theme presets for visual personalization.

### Customer Story
- Your Bookmarks Became a Workspace: Instead of a static list, your saved content became something you can browse, group, and navigate with intent.
- Organization Got Practical: Tags and filtering made it easier to find the right thing when you need it, not minutes later.
- The New Tab Became Useful: Widgets turned the home surface into a working dashboard instead of empty space.
- Personalization Started Early: Theme presets gave you an immediate way to make the product feel like your own.
