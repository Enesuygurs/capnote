# Capnote design rules

These rules describe how the interface is built. Every change to the interface follows them, and anything that breaks one is a bug. The values are CSS custom properties in `src/renderer/css/01-base.css` (light theme on `:root`, dark theme on `[data-theme='dark']`). Components use the tokens, never raw values; the only raw values are the hairlines listed below.

## 1. Layout

The window has two layers:

- **Chrome** (`--chrome`): the titlebar and the sidebar share one background with no line between them. The titlebar holds the sidebar toggle on the left, the app name centered on the window, and the window buttons on the right (minimize and maximize are drawn to match the close icon's stroke).
- **Content panel** (`.main-content`, `--surface`): a rounded panel (`--radius-lg`, `--panel-shadow`) on the chrome, 8px from the right and bottom edge (and from the left edge when the sidebar is hidden).

```
+----------------------------------------------------------------------+
| [=]                           Capnote                [-] [o] [x]     |
| [mark] Capnote [t][b] +------------------------------------------+   |
| [+ New note]          | Title                          [actions] |   |
| [search]              | meta                                     |   |
| [All | Today | Favs]  |------------------------------------------|   |
| NOTES 5      [+] [s]  | page body                                |   |
| rows                  |                                          |   |
|                       |                                          |   |
| [gear Settings]       +------------------------------------------+   |
+----------------------------------------------------------------------+
```

**Sidebar** (`--sidebar-width`, 12px side padding), in three parts:

1. Fixed top, 8px apart: the header (44px: the app mark and name on the left, also the home button, filling the width up to the tools, its name in a dark tone warmed by the accent; to-dos, reminders and notifications as 32px neutral icon buttons on the right, with the count on the corner and the name as a tooltip), the new note button, the search field and the list filter (a segmented control).
2. Scrolling list: the `NOTES` section header and the rows of notes and folders. A note's actions are in its right-click menu; rows have no buttons. Dragging a note onto another places it before or after it (an insertion line shows where) and switches the list to the custom order. A double-click renames a note or a folder in place (the row becomes the field; Enter or leaving it saves, Escape cancels). Ctrl/Cmd+click selects notes or folders, never both (picking the other kind starts a new selection); right-click on the selection opens its menu, which shows only the actions that fit what is selected (notes: favorite, pin, duplicate, take out of folder; folders: pin; both: delete). Dragging a selected note moves the whole selection. Escape or a click on an empty part of the list clears it. Pinned folders sit above the notes, with a small gold pin. Pinned notes and folders cannot be dragged: the drag is refused and the row shakes (320ms, none with reduced motion); a dragged selection leaves its pinned notes in place. A folder opens and closes with a 200ms height and fade transition.
3. Fixed bottom: settings, one full-width row, left-aligned with the list rows.

**Every screen in the panel** has the same structure:

- `.page-header`: an optional `.page-icon` (a 44px tile in the screen's tone, on to-dos and notifications), the title (`.page-title`, 24/32 semibold) with a subtitle (`.page-subtitle`, 13/20, right under the title) or a meta line (`.page-meta`, 4px below) under it, and actions (`.page-actions`) on the right. Padding is 20px vertically and `--gutter` (32px) horizontally, with a divider below. A body with parts uses `.page-section`s, each under a `.page-section-label` (a section label with an optional count), 32px apart (the body's gap, so a hidden section leaves no space); a section with nothing in it is hidden.
- `.page-body`: scrolls, 24px top padding, `--gutter` on the other sides.

The viewer, the editor, to-dos, reminders and notifications all use this header, so the title is in the same place on every screen. The editor's toolbar belongs to its header region: header, then toolbar, then the divider.

## 2. No borders

Components are separated by **surface tone, spacing and shadow**, never by an outline. Buttons, cards, fields, chips, menus and dialogs have no border, and neither does the window.

Lines (`--divider`, 1px) are allowed only in these places:

- **Region dividers inside the content panel**: below a page header (or the editor toolbar), above the viewer's stats bar.
- **Note content**: table cells, blockquotes and horizontal rules.
- **Menus**: one divider before a destructive item (`.menu-divider`).
- **Transient feedback**: the dashed outline of a drop target while dragging (the root list shows "take out of the folder" only while a note from a folder is dragged), the insertion line when reordering folders, and the dashed outline of a selected image.

States that could be a border use something else:

| State                  | Shown with                                                            |
| ---------------------- | --------------------------------------------------------------------- |
| Hover                  | `--tint-hover` (or `--field-hover` on fields)                         |
| Keyboard focus         | `--focus-ring` (a box-shadow)                                         |
| Active / selected / on | `--accent-tint` background and `--accent-text`                        |
| Chosen segment / tab   | `--segment-active` (one neutral step darker than the track), semibold |
| Pinned / locked note   | yellow thumbtack (the default accent) / neutral lock                  |
| Selected (Ctrl+click)  | `--accent-tint-strong`                                                |
| Favorite note          | a rose heart at the end of the row                                    |
| Unread notification    | an 8px accent dot before the title                                    |
| Selected color swatch  | `--swatch-ring`                                                       |

## 3. Surfaces

| Token                           | Use                                                               |
| ------------------------------- | ----------------------------------------------------------------- |
| `--chrome`                      | window background: titlebar and sidebar                           |
| `--surface`                     | the content panel                                                 |
| `--surface-raised`              | floating things: menus, popovers, dialogs, toasts (with a shadow) |
| `--card`                        | cards, the editor's properties panel, the settings tab column     |
| `--field`, `--field-hover`      | inputs, selects, secondary buttons, chips, counts                 |
| `--tint-hover`, `--tint-strong` | hover on transparent things; hover on tinted things               |
| `--accent-tint`                 | active, selected and "on" backgrounds                             |

Cards and fields are translucent tints, so they are always one step from whatever they sit on, in both themes. A field inside a card is still `--field`.

Shadows: `--panel-shadow` on the content panel, `--shadow-popover` on menus and toasts, `--shadow-modal` on dialogs. Nothing else has a shadow.

## 4. Spacing

Everything sits on a **4px grid** and uses the spacing tokens:

| Token        | px  | Typical use                                            |
| ------------ | --- | ------------------------------------------------------ |
| `--space-1`  | 4   | between icon buttons, inside chips, menu padding       |
| `--space-2`  | 8   | between buttons, icon to text, sidebar stack           |
| `--space-3`  | 12  | sidebar padding, row padding, between cards            |
| `--space-4`  | 16  | card padding, toolbar group gap                        |
| `--space-5`  | 20  | dialog body padding (vertical)                         |
| `--space-6`  | 24  | page header (vertical), dialog padding, between groups |
| `--space-8`  | 32  | the page gutter (`--gutter`)                           |
| `--space-12` | 48  | padding of a large empty state                         |

Rules:

- **Symmetric padding.** Top equals bottom and left equals right, unless something (a close button, a scrollbar) needs room on one side.
- **One edge per region.** Everything in a column starts at the same x. In the panel that is the gutter: title, toolbar, note text, cards and the stats bar. Inside a card, the title, the rows and the field text share one edge.
- **Equal rhythm.** Repeated items have equal heights and equal gaps: sidebar rows, menu items, setting rows, cards.
- **Highlighted neighbours never touch.** Rows, tabs, segments and menu items in a list are `--stack-gap` (2px) apart, so a hovered item stays separate from the active one.
- The only values off the grid are hairlines: 1px dividers, the 2px `--stack-gap`, and 2px insets (segmented control padding, toggle knob, insertion line).

## 5. Sizes

| Size           | Height | Used by                                                                   |
| -------------- | ------ | ------------------------------------------------------------------------- |
| `--control-xs` | 28     | segments, emoji tabs, sidebar section controls, row actions               |
| `--control-sm` | 32     | small buttons, selects, search, toolbar buttons, sidebar rows, menu items |
| `--control-md` | 36     | buttons, fields, header icon buttons, to-do rows                          |
| `--control-lg` | 44     | large buttons, export choices                                             |

Controls next to each other have the same height. Icon buttons are squares: `.btn-icon` 36, `.btn-icon-sm` 32, `.btn-icon-xs` 28. Icons are 13–14px in rows and buttons, 16px in the mood and weather pickers.

## 6. Shape

| Token           | px  | Use                                                                        |
| --------------- | --- | -------------------------------------------------------------------------- |
| `--radius-sm`   | 6   | things 24px or smaller: chips, segments, emoji tabs, small buttons in rows |
| `--radius-md`   | 8   | controls: buttons, fields, selects, rows, menu items                       |
| `--radius-lg`   | 12  | containers: the content panel, cards, menus, dialogs, toasts               |
| `--radius-full` | 999 | counts, toggles, swatches, the unread dot                                  |

A container's inner items are rounded less than the container by its padding (a 12px menu with 4px padding holds 8px items; an 8px track with 2px padding holds 6px segments).

## 7. Type

| Role                       | Size / line height                  | Weight                               |
| -------------------------- | ----------------------------------- | ------------------------------------ |
| Welcome title              | `--fs-4xl` 28 / 36                  | 600                                  |
| Page title                 | `--fs-3xl` 24 / 32                  | 600                                  |
| Dialog and settings title  | `--fs-xl` 18 / 32                   | 600                                  |
| Note text                  | `--fs-lg` 16 / 1.75                 | 400                                  |
| Body, rows, buttons        | `--fs-base` 14 / 20                 | 400 (500 on buttons and active rows) |
| Meta, menus, small buttons | `--fs-md` 13                        | 400                                  |
| Descriptions, chips, stats | `--fs-sm` 12 / 16                   | 400–500                              |
| Section labels, counts     | `--fs-xs` 11 / 16, uppercase labels | 600                                  |

Alignment moves the whole line: an aligned task keeps its box next to its text, and an aligned list item keeps its bullet or number with it.

Text colors: `--text-strong` for titles, `--text-primary` for text, `--text-secondary` for meta and descriptions, `--text-muted` for icons, hints and placeholders.

## 8. Color

- The accent (`--accent-color`) marks only: the active item, the primary action, "on" states (toggles, checkboxes) and focus. The chosen mood and weather keep their hover look (a tint of their own tone), not the accent. Text on an accent tint uses `--accent-text`.
- Red (`--error-color`) is only for destructive actions and errors.
- **Tones** give a kind of thing its own icon color, the same everywhere it appears. An element takes one with a `.tone-*` class (`rose`, `red`, `amber`, `green`, `teal`, `sky`, `blue`, `violet`, `slate`), which sets `--tone`; each theme has its own values.

| Thing                                  | Tone                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Favorite (sidebar heart, menu, viewer) | rose                                                                                       |
| Pin                                    | `--tone-gold`, the yellow of the default accent                                            |
| To-dos / notifications (page icon)     | blue / amber                                                                               |
| Settings tabs                          | a tile each: blue, rose, amber, slate, green, violet                                       |
| Moods and weather                      | one per value (`05-editor.css`): on hover and when chosen in the editor, and in the viewer |

- A group of icons (mood and weather pickers, toolbars) is never colored all at once: its icons are neutral and only the hovered one shows its tone.
- Other icons are neutral (`--text-muted` / `--text-secondary`), never the accent: lock, copy, edit and the sidebar tools among them. A tone is only for a state that must stand out (favorite, pin) or a choice that is its own thing (mood, weather, settings tabs).
- Folder colors are the user's; they color only the folder icon. A new folder gets a vivid, mid-light color (no dark or washed-out shades) that no other folder has yet, when one is left.

## 9. Components

**Buttons** (`08-buttons.css`)

| Class                       | Look                       | Use                                       |
| --------------------------- | -------------------------- | ----------------------------------------- |
| `.btn-primary`              | accent fill, white text    | the main action of a view or dialog (one) |
| `.btn-tinted`               | accent tint, accent text   | actions repeated in lists, row actions    |
| `.btn-tinted.btn-success`   | green tint, green text     | finishing something (a reminder done)     |
| `.btn-secondary`            | `--field` fill             | cancel, close and neutral actions         |
| `.btn-outline`              | transparent, tint on hover | low-emphasis actions                      |
| `.btn-danger`               | red fill                   | confirming a destructive action           |
| `.btn-outline.btn-danger`   | red tint, red text         | starting a destructive action             |
| `.btn-icon` (+ `-sm`/`-xs`) | transparent square         | toolbars, headers, row actions            |

Actions use the accent: a form's add or set button is `.btn-primary`. On a list item each kind of action has its own look, so buttons side by side never look alike: opening the item is `.btn-secondary`, its main action (mark as read) `.btn-tinted`, finishing it `.btn-tinted.btn-success`, deleting it `.btn-outline.btn-danger`. `.btn-secondary` is otherwise for cancelling, closing and other neutral choices. Hover changes color only; nothing moves, scales or glows.

**Fields** (`.form-input`, 36px; `.form-input-sm`, 32px), **selects** (`.select-small`, the custom `.custom-select`), the **toggle** (36×20), **chips** (`.chip`, 24px, neutral), **counts** (`.nav-count`, 20px pill; accent when unread) and the **segmented control** (`.segmented` / `.segment`) are in `12-controls.css`.

**Menus**: every popup list is a `.menu` (`--surface-raised`, `--radius-lg`, 4px padding, `--shadow-popover`) with 32px items (`.menu-item`) 2px apart. Item icons take their action's tone. A destructive item is `.menu-item-danger`, last, after a `.menu-divider`; the chosen item uses `--accent-text`. Items that do not apply are hidden with the `hidden` attribute, which always wins over display rules. The note and folder context menus (right-click, kept inside the window) are compact: 28px items with 12px text. Sort, the toolbar selects and the emoji panel all use it. Every menu and panel closes on a click outside it.

**Dialogs** (`09-modals.css`): `.modal-header` (title + `.modal-close`), `.modal-body`, `.modal-footer` with the buttons on the right, primary last. 24px around, 20px between the parts. Widths: `.modal-sm` 400, default 480, settings 760. Titles have no icons. A confirmation is a normal dialog with the message in the body.

**Cards** (`17-screens.css`): `.card` for grouped content (a to-do section), `.list-card` for an item with actions (a reminder, a notification): text on the left, buttons on the right, wrapping below on narrow windows. 16px padding, 12px apart.

**Section labels** (`.section-label`, `.panel-label`): 11px uppercase, `--text-muted`, 8px above their content. Used for the sidebar's notes header, the editor's properties panel and the settings groups.

**Settings**: a tab is a title and groups; a group is a section label and a `.settings-group` card of `.setting-item` rows (label and description on the left, control on the right).

**Empty states** (`.empty-state`, `-large`): a centered muted icon, an optional title and a line of text.

**Overview** (`07-note-screens.css`, the home page once there are notes): `.stat-tile`s (a muted icon, a 24/32 number, a 12px label; no chart for a single number), then a `.calendar-card` and the chart cards side by side (`minmax(300px, 1fr)`). Calendar days are 36px+ squares 2px apart: today is filled with `--accent-color` (its text and mood icon in `--text-on-accent`), the chosen day an accent tint, a day with notes shows its mood icon in the mood's tone (or an accent dot). Charts follow one rule: one measure, one color (`--accent-color`); a bar's identity comes from its icon and name, never from its color alone. Bars are 8px tall and fully rounded; the month columns are rounded at the top only, with the current month labelled; every bar and column has a tooltip with its exact value.

**Note links** (`a.note-link`): an accent-tinted label (`--accent-tint`, `--accent-text`, `--radius-sm`); a link to a deleted note is `--field` with muted, crossed-out text. "Notes that link here" is a fixed bar between the note and its numbers (a divider above, a muted label with a link icon, then `.chip.backlink` buttons that scroll sideways); it shows only when another note links here.

**Tags page**: `.tag-chip` (32px, name, a count pill; the chosen tag in the accent tint) in a wrapping cloud, then the chosen tag's notes as whole-card buttons. The tag the list is filtered by shows under the list filter as a removable `.tag-filter-chip`.

**Split button**: "New note" and its template button share one control at the small size (32px): 2px apart, the inner corners square.

**Reminder form** (editor side panel): quick choices first, as 2-column tiles (`--field`; the name on top, a muted icon and the time it would ring under it; the chosen one in the accent tint; "this evening" is hidden once it is evening). Then a date and a time field side by side (a muted icon inside each; clicking the field opens the picker), "Repeat" as a small `.segmented`, the weekdays as seven round toggles (the chosen ones `--accent-color`) and a full-width primary button. The note's reminders are cards: an accent-tinted icon (a bell, or arrows when it repeats), the day in bold and the time and repeat in muted text.

**Editor header**: the view controls (Markdown and HTML preview, the side panel) sit with Cancel and Save, so the formatting toolbar holds only content tools (two rows at the smallest window).

**Toast**: `--surface-raised`, bottom center, its icon colored by kind.

## 10. Checking a change

- `npm test` for behaviour, `npm run test:visual` for every screen in both themes (compare with `tests/visual/accepted`, accept with `--accept` once reviewed).
- Look at light and dark mode. A change that only works in one theme is not done.
- Check that new UI uses existing components and tokens; a new component is added here first.
