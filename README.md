# Capnote

Capnote is a desktop app for notes and journaling. Everything stays on your computer: there is no account and no cloud sync.

## Features

- **Rich text and Markdown:** headings, lists, task lists, quotes, dividers, tables, code blocks, links, strikethrough, images and file attachments, Markdown shortcuts while typing ("## ", "- ", "[] ", "```"), undo for every tool, plus Markdown notes with a live preview and an HTML preview.
- **Links between notes:** type `[[` to link to another note; a note lists the notes that link to it.
- **Organizing:** folders with colors, tags with a tags page and a tag filter, favorites, pinned notes and folders, a Today view, a custom order by dragging, selecting several notes at once, sorting and search.
- **Templates:** start a note as a journal entry, meeting notes or a weekly plan.
- **Journaling:** mood and weather for each note, an overview with a mood calendar, the writing streak, how moods and weather are spread and the words per month, word and character counts, reading time and an edit history.
- **Reminders and to-dos:** reminders with desktop notifications, and a to-do list grouped into sections.
- **Locked notes:** a locked note is encrypted with its password (PBKDF2-SHA256 and AES-GCM). If you forget the password, the note cannot be recovered.
- **Export and backup:** export a note as PDF, HTML, plain text or JSON, export every note as Markdown files and import Markdown files, and back up or restore all data as a JSON file.
- **Desktop integration:** a quick note shortcut that works from any app, tray icon, close to tray (Windows), start at login, a chosen start page, light and dark themes, accent colors, and English and Turkish.

### Keyboard shortcuts

| Shortcut           | Action                             |
| ------------------ | ---------------------------------- |
| Ctrl/Cmd + N       | New note                           |
| Ctrl/Cmd + S       | Save the note being edited         |
| Ctrl/Cmd + E       | Edit the open note                 |
| Ctrl/Cmd + D       | Duplicate the open note            |
| Ctrl/Cmd + F       | Search notes                       |
| Ctrl/Cmd + K       | Add or edit a link in the editor   |
| Ctrl/Cmd + Z / Y   | Undo / redo in the editor          |
| Ctrl/Cmd + Enter   | Leave a code block in the editor   |
| Ctrl/Cmd + Alt + N | New note from any app (quick note) |
| Esc                | Close the open dialog or editor    |

## Where your data lives

Notes, folders, reminders, notifications, to-dos and settings are stored as JSON files in the app's data folder:

- Windows: `%APPDATA%\Capnote`
- macOS: `~/Library/Application Support/Capnote`
- Linux: `~/.config/Capnote`

Images and files added to notes are copied into the `uploads` folder there. Once a day, Capnote copies the data files into `backups/` and keeps the last 7 days. To move to another computer, use **Settings → Data Management → Export Data** and import the file on the other side.

## Development

Requires Node.js 22.12 or later.

```sh
npm install
npm run dev      # start with hot reload and DevTools
npm start        # start normally
npm run lint     # ESLint
npm run format   # Prettier
npm run icons    # regenerate the icons from assets/icons/source/*.svg
npm test         # app tests (starts the real app per test)
npm run test:visual  # compare screenshots of every screen
```

The main process is in `src/main/`, the preload bridge in `src/preload.cjs`, and the interface in `src/renderer/`: `js/app.js` plus one module per feature in `js/features/`, the markup of the editor and the dialogs in `js/templates/`, and stylesheets in `css/`, loaded in the numbered order.

Interface changes follow the design rules in [docs/DESIGN.md](docs/DESIGN.md): one layout for every screen, a shared set of components, no borders, spacing on a 4px grid, and the shared tokens for surfaces, sizes, shape and type.

## Tests

Each file in `tests/cases` starts the real app with an empty data folder, runs a script inside the window and compares the result with the `expected` value in the same file (a regular expression or a function can stand in for values that change, such as dates). Tests that need existing data, for example data left by an older version, write it in a `seed` step first. `npm test -- search` runs only the tests whose name contains "search"; `--print` shows every result.

`npm run test:visual` captures every screen and dialog in both themes and compares them pixel by pixel with the screenshots accepted earlier on the same machine (font rendering differs between machines, so they are not in git). The first run, or `npm run test:visual -- --accept` after a wanted change, accepts the current screenshots; differences are saved as images in `tests/visual/diff`.

## Building

```sh
npm run build-win    # Windows installer (NSIS)
npm run build-mac    # macOS disk image
npm run build-linux  # Linux AppImage
```

Output goes to `dist/`.

## Releasing updates

Installed copies on Windows and Linux check GitHub Releases for a newer version, download it in the background and install it on restart (Settings → About shows the status). macOS updates need a signed app, so the macOS build does not update itself.

1. Raise `version` in `package.json`.
2. Set a GitHub token with access to the repository in `GH_TOKEN`.
3. Run `npm run release`. It builds the Windows installer and the AppImage and uploads them, with the `latest.yml` files the updater reads, to a draft release.
4. Publish the draft release on GitHub.

## License

MIT — see [LICENSE](LICENSE).
