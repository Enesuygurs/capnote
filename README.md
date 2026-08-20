# Capnote

Capnote is a desktop app for notes and journaling. Everything stays on your computer: there is no account and no cloud sync.

## Features

- **Rich text and Markdown:** headings, lists, checklists, tables, code blocks, links, images and file attachments, plus Markdown notes with a live preview and an HTML preview.
- **Organizing:** folders with colors, tags, favorites, pinned notes, a Today view, sorting and search.
- **Journaling:** mood and weather for each note, word and character counts, reading time and an edit history.
- **Reminders and to-dos:** reminders with desktop notifications, and a to-do list grouped into sections.
- **Locked notes:** a locked note is encrypted with its password (PBKDF2-SHA256 and AES-GCM). If you forget the password, the note cannot be recovered.
- **Export and backup:** export a note as PDF, HTML, plain text or JSON, and back up or restore all data as a JSON file.
- **Desktop integration:** tray icon, close to tray (Windows), start at login, light and dark themes, accent colors, and English and Turkish.

### Keyboard shortcuts

| Shortcut         | Action                           |
| ---------------- | -------------------------------- |
| Ctrl/Cmd + N     | New note                         |
| Ctrl/Cmd + S     | Save the note being edited       |
| Ctrl/Cmd + E     | Edit the open note               |
| Ctrl/Cmd + D     | Duplicate the open note          |
| Ctrl/Cmd + F     | Search notes                     |
| Ctrl/Cmd + Enter | Leave a code block in the editor |
| Esc              | Close the open dialog or editor  |

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
```

The main process is in `src/main/`, the preload bridge in `src/preload.cjs`, and the interface in `src/renderer/`: `js/app.js` plus one module per feature in `js/features/`, and stylesheets in `css/`, loaded in the numbered order.

## Building

```sh
npm run build-win    # Windows installer (NSIS)
npm run build-mac    # macOS disk image
npm run build-linux  # Linux AppImage
```

Output goes to `dist/`.

## License

MIT — see [LICENSE](LICENSE).
