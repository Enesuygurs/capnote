# Capnote design rules

These rules describe how the interface is built. Every change to the interface follows them, and anything that breaks one is a bug. The values are CSS custom properties in `src/renderer/css/01-base.css` (light theme on `:root`, dark theme on `[data-theme='dark']`). Components use the tokens, never raw values; the only raw values are the hairlines listed below.

## 1. Layout

The window has two layers:

- **Chrome** (`--chrome`): the titlebar and the sidebar share one background with no line between them.
- **Content panel** (`.main-content`, `--surface`): a rounded panel (`--radius-lg`, `--panel-shadow`) on the chrome, 8px from the right and bottom edge (and from the left edge when the sidebar is hidden).

```
+----------------------------------------------------------------------+
| [=] [mark] Capnote                                     [-] [o] [x]   |
| [+ New note]          +------------------------------------------+  |
| [search]              | Title                          [actions] |  |
| [All | Today | Favs]  | meta                                     |  |
| NOTES 5      [+] [s]  |------------------------------------------|  |
| rows                  | page body                                |  |
|                       |                                          |  |
| [todo][rem][in][set]  +------------------------------------------+  |
+----------------------------------------------------------------------+
```

**Sidebar** (`--sidebar-width`, 12px side padding), in three parts:

1. Fixed top: the new note button, the search field and the list filter (a segmented control), 8px apart.
2. Scrolling list: the `NOTES` section header and the rows of notes and folders.
3. Fixed bottom toolbar: to-dos, reminders, notifications and settings as equal-width icon buttons with their counts.

**Every screen in the panel** has the same structure:

- `.page-header`: title (`.page-title`, 24/32 semibold) with a subtitle or meta line (`.page-subtitle` / `.page-meta`, 13px) below it, and actions (`.page-actions`) on the right. Padding is 24px vertically and `--gutter` (32px) horizontally, with a divider below.
- `.page-body`: scrolls, 24px top padding, `--gutter` on the other sides.

The viewer, the editor, to-dos, reminders and notifications all use this header, so the title is in the same place on every screen. The editor's toolbar belongs to its header region: header, then toolbar, then the divider.

## 2. No borders

Components are separated by **surface tone, spacing and shadow**, never by an outline. Buttons, cards, fields, chips, menus and dialogs have no border, and neither does the window.

Lines (`--divider`, 1px) are allowed only in these places:

- **Region dividers inside the content panel**: below a page header (or the editor toolbar), above the viewer's stats bar.
- **Note content**: table cells, blockquotes and horizontal rules.
- **Transient feedback**: the dashed outline of a drop target while dragging, the insertion line when reordering folders, and the dashed outline of a selected image.

States that could be a border use something else:

| State                  | Shown with                                          |
| ---------------------- | --------------------------------------------------- |
| Hover                  | `--tint-hover` (or `--field-hover` on fields)       |
| Keyboard focus         | `--focus-ring` (a box-shadow)                       |
| Active / selected / on | `--accent-tint` background and `--accent-text`      |
| Chosen segment / tab   | a raised segment (`--surface-raised` + soft shadow) |
| Pinned / locked note   | thumbtack / lock icon in place of the note icon     |
| Unread notification    | an 8px accent dot before the title                  |
| Selected color swatch  | `--swatch-ring`                                     |

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
- The only values off the grid are hairlines: 1px dividers, and 2px insets (segmented control padding, toggle knob, insertion line).

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

Text colors: `--text-strong` for titles, `--text-primary` for text, `--text-secondary` for meta and descriptions, `--text-muted` for icons, hints and placeholders.

## 8. Color

- The accent (`--accent-color`) marks only: the active item, the primary action, "on" states (toggles, checkboxes, active tool) and focus. Text on an accent tint uses `--accent-text`.
- Red (`--error-color`) is only for destructive actions and errors; green and amber only for toast icons.
- Icons are neutral (`--text-muted` / `--text-secondary`), never decorative accent.
- Folder colors are the user's; they color only the folder icon.

## 9. Components

**Buttons** (`08-buttons.css`)

| Class                       | Look                       | Use                                       |
| --------------------------- | -------------------------- | ----------------------------------------- |
| `.btn-primary`              | accent fill, white text    | the main action of a view or dialog (one) |
| `.btn-secondary`            | `--field` fill             | other actions                             |
| `.btn-outline`              | transparent, tint on hover | low-emphasis actions                      |
| `.btn-danger`               | red fill                   | confirming a destructive action           |
| `.btn-outline.btn-danger`   | red tint, red text         | starting a destructive action             |
| `.btn-icon` (+ `-sm`/`-xs`) | transparent square         | toolbars, headers, row actions            |

Hover changes color only; nothing moves, scales or glows.

**Fields** (`.form-input`, 36px; `.form-input-sm`, 32px), **selects** (`.select-small`, the custom `.custom-select`), the **toggle** (36×20), **chips** (`.chip`, 24px, neutral), **counts** (`.nav-count`, 20px pill; accent when unread) and the **segmented control** (`.segmented` / `.segment`) are in `12-controls.css`.

**Menus**: every popup list is a `.menu` (`--surface-raised`, `--radius-lg`, 4px padding, `--shadow-popover`) with 32px items (`.menu-item`). A destructive item is `.menu-item-danger`; the chosen item uses `--accent-text`. Note options, the folder context menu, sort, the toolbar selects and the emoji panel all use it.

**Dialogs** (`09-modals.css`): `.modal-header` (title + `.modal-close`), `.modal-body`, `.modal-footer` with the buttons on the right, primary last. 24px around, 20px between the parts. Widths: `.modal-sm` 400, default 480, settings 760. Titles have no icons. A confirmation is a normal dialog with the message in the body.

**Cards** (`17-screens.css`): `.card` for grouped content (a to-do section), `.list-card` for an item with actions (a reminder, a notification): text on the left, buttons on the right, wrapping below on narrow windows. 16px padding, 12px apart.

**Section labels** (`.section-label`, `.panel-label`): 11px uppercase, `--text-muted`, 8px above their content. Used for the sidebar's notes header, the editor's properties panel and the settings groups.

**Settings**: a tab is a title and groups; a group is a section label and a `.settings-group` card of `.setting-item` rows (label and description on the left, control on the right).

**Empty states** (`.empty-state`, `-large`): a centered muted icon, an optional title and a line of text.

**Toast**: `--surface-raised`, bottom center, its icon colored by kind.

## 10. Checking a change

- `npm test` for behaviour, `npm run test:visual` for every screen in both themes (compare with `tests/visual/accepted`, accept with `--accept` once reviewed).
- Look at light and dark mode. A change that only works in one theme is not done.
- Check that new UI uses existing components and tokens; a new component is added here first.
