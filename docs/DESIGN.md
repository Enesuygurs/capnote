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

1. Fixed top, 8px apart: the header (44px: the app mark and name on the left, also the home button, filling the width up to the tools, its name in a dark gray; to-dos, reminders and notifications as 32px icon buttons on the right, each in the tone of its page's header icon (to-dos blue, reminders amber, notifications red): neutral at rest, tinted with the tone when its page is open, the count on the corner filled with the tone, and the name as a tooltip), the new note button, the search field and the list filter (a segmented control).
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
| Page title                 | `--fs-3xl` 24 / 32                  | 600                                  |
| Dialog and settings title  | `--fs-xl` 18 / 32                   | 600                                  |
| Note text                  | `--fs-lg` 16 / 1.75                 | 400                                  |
| Body, rows, buttons        | `--fs-base` 14 / 20                 | 400 (500 on buttons and active rows) |
| Meta, menus, small buttons | `--fs-md` 13                        | 400                                  |
| Descriptions, chips, stats | `--fs-sm` 12 / 16                   | 400–500                              |
| Section labels, counts     | `--fs-xs` 11 / 16, uppercase labels | 600                                  |

Alignment moves the whole line: an aligned task keeps its box next to its text, and an aligned list item keeps its bullet or number with it.

Text colors: `--text-strong` for titles and `--text-primary` for text, neutral dark grays close to black but not black (`#2a2a2a`, `#363636` in the light theme; light grays in the dark one), `--text-secondary` for meta and descriptions, `--text-muted` for icons, hints and placeholders.

## 8. Color

- The accent (`--accent-color`) marks only: the active item, the primary action, "on" states (toggles, checkboxes) and focus. The chosen mood and weather keep their hover look (a tint of their own tone), not the accent. Text on an accent tint uses `--accent-text`.
- Red (`--error-color`) is only for destructive actions and errors.
- **Tones** give a kind of thing its own icon color, the same everywhere it appears. An element takes one with a `.tone-*` class (`rose`, `red`, `amber`, `green`, `teal`, `sky`, `blue`, `violet`, `slate`), which sets `--tone`; each theme has its own values.

| Thing                                  | Tone                                                                                                                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Favorite (sidebar heart, menu, viewer) | rose                                                                                                                                                                                                                        |
| Pin                                    | `--tone-gold`, the yellow of the default accent                                                                                                                                                                             |
| To-dos / notifications (page icon)     | blue / amber                                                                                                                                                                                                                |
| Settings tabs                          | a tile each: blue, rose, amber, slate, green, violet                                                                                                                                                                        |
| Moods and weather                      | one distinct color per value (`--mood-*` and `--weather-*` in `01-base.css`, each set checked so no two look alike, for light and dark): on hover and when chosen in the editor, in the viewer, the calendar and the charts |

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

**Overview** (`07-note-screens.css`, the home page, also when there are no notes yet): `.stat-tile`s (an icon in its own tone: notes blue, days green, streak amber, longest streak violet, words of the last 30 days rose; the icon beside a 24/32 number, a 12px label on one line under both, 12px padding top and bottom; no chart for a single number), then the `.calendar-card` beside the words per month, and under them the mood and weather cards; both rows split in the middle, so the cards line up, and every gap is 16px. The calendar grows with the window in both directions (half the width, `minmax(380px, 1.4fr)` tall), so its days stay near square. The overview fills the page and does not scroll: a card's size comes from the layout, never from its data, and what does not fit scrolls inside it (the calendar's weeks share its height; a chosen day's notes scroll with the card). The smallest window (1200×970, `MIN_SIZE` in `window.js`, at most the screen's work area) fits it all; a shorter screen scrolls the page past a 440px card row, and below 1150px the cards stack at 300px each. The overview's cards have 20px padding (the calendar 16px top and bottom). Calendar days are rounded (10px) 44px+ tiles 4px apart: the number, and under it the day's 17px mood icon in the mood's color on a 12% tint of it (a day with notes but no mood an accent dot); today is filled with `--accent-color` at 90% (its number and mood in `--text-on-accent`), the chosen day an accent tint (today, when chosen, a darker accent fill), never faded; days of the months around are at 40% without tints. A chosen day's notes show in the words card in place of the chart (the day as its title, the notes scrolling inside the card); choosing the day again brings the chart back. Mood and weather are two columns of tiles under a header with the title and the number of notes: each tile a 32px square of the value's color at 14% with its icon, the name (13/500) with the count and share in `--text-muted`, and a 6px bar in the value's color (the icon and name say which it is, so the color is never alone). The words per month are columns in `--accent-color` (one measure, one color), the last 12 months, rounded at the top only, each with its number right above its bar (the current month's in `--text-strong`, none for an empty month); every bar and column has a tooltip with its exact value.

**Empty note list**: with no notes yet, a muted "No notes yet" and a tinted "Write your first note" button; with notes but none matching the search or filters, a muted "No matching notes".

**Focus mode** (editor, the expand button with the view tools): only the title and the text; the sidebar, the formatting toolbar and the side panel are hidden, the text is a 760px column in the middle and the header lines up with it. Escape or the button leaves it, and so does leaving the editor.

**Year in review** (the overview's "Year in review" button; its own page with a back button, the previous/next year and "Save as image"): one card, at most 640px wide on `--surface` with a hairline ring: the year large in `--accent-text` with the app's mark, three figures on `--card` (notes, words, days written) with toned icons, the months as twelve columns in a light accent (the most written one in the full accent and named above), then two-column facts on `--card`, each with an icon on its tone's tint: the most frequent mood, the longest streak with its dates, the most used tags, the longest note. Saving captures the card as shown, with the page header out of the way for the moment.

**Note links** (`a.note-link`): the chip of the "Linked notes" bar at the same size (24px, 12px text, a note icon and the title, `--radius-sm`) in the accent (`--accent-tint`, `--accent-text`) instead of gray; a link to a deleted note is `--field` with muted, crossed-out text. "Notes that link here" is a fixed bar between the note and its numbers (a divider above, the muted label "Linked notes:" with a link icon, then `.chip.backlink` buttons that scroll sideways); it shows only when another note links here.

**Note history** (the viewer's history button): the current version first on the accent tint, then the earlier versions, the newest first (the time each was saved, and a secondary "View" button; an old entry whose text was not kept says so in muted text), then the creation on `--card`. "View" shows that version read-only in the same dialog (a back button, its time, its title, its text on `--card`) with a primary "Restore this version" in the footer; restoring keeps the current text as a new version. The latest 30 versions keep their text; locked notes keep none on disk.

**Tags page**: `.tag-chip` (32px, name, a count pill; the chosen tag in the accent tint) in a wrapping cloud, then the chosen tag's notes as whole-card buttons. The tag the list is filtered by shows under the list filter as a removable `.tag-filter-chip`.

**Archive page** (opened from the sidebar footer): like the tags page, a `.page-header` (a slate archive icon) and one `.list-card` per archived note, the latest edited first: the title, the date and folder in muted text, then "View" (`.btn-secondary`) and "Unarchive" (`.btn-tinted`). The notes header has an archive button next to the tags button; an archived note open in the viewer shows an "Archived" `.chip` in its meta line, and its archive button turns into "Unarchive".

**Automatic backups** (Settings > Data): a `.settings-section-desc` line under the section label (12px, secondary text), then one `.setting-item` per backup in a `.settings-group`: the day (or "Before the last restore") as the label, "as at the start of the day" and the note and folder counts below, and a tinted "Restore" button. Restoring asks first and reloads the app on the restored data.

**Split button**: "New note" and its template button are one accent control at the small size (32px): one surface with the outer corners rounded, a 1px line of `--text-on-accent` at 35% between the halves (8px short of the edges), each half darkening on its own on hover; the 36px arrow half turns its chevron up while the templates menu is open.

**Reminder form** (editor side panel): two field-style buttons side by side, the day ("Thu 5 March", or a muted "Date") and the time ("18:30", or a muted "Time", as wide as its text), each opening its own picker; then "Repeat" as a small `.segmented`, the weekdays as seven round toggles (the chosen ones `--accent-color`) and a full-width primary button. Nothing is filled in by itself: the day, the hour and the minute are each chosen by hand; setting a reminder with a part missing shows a warning naming it and rings the missing button red with a short shake. The note's reminders are cards: an accent-tinted icon (a bell, or arrows when it repeats), the day in bold and the time and repeat in muted text.

**Date picker** (`.date-picker`) and **time picker** (`.time-picker`): popovers under their button (above it when there is no room), their right edge on the button's; one open at a time, closed by a click outside, Escape and scrolling the panel. The date picker: the month and year with previous/next buttons and a Monday-first month of 28px round days (today in bold `--accent-text`, the chosen day `--accent-color`, days before today faded and disabled); choosing a day closes it. The time picker: hour and minute columns (5-minute steps) under small labels, five options tall and scrolling without a bar; nothing is marked until chosen, the chosen one is `--accent-color` and on opening sits in the middle (with nothing chosen, the next hour at :00); on today the times already past are faded and disabled; then a full-width Done button.

**Checkboxes** (every one except the settings switches and the weekday toggles): 16px, a 1.5px border in the text color at 28% (not the browser's black), 4px corners; ticked, filled with `--accent-color` with a white tick.

**App name** (sidebar, next to the icon): `--text-primary` mixed with 25% of `--text-secondary` at weight 700, a dark gray close to black but not black (a light gray in the dark theme).

**Note header** (viewer and editor): the title, the date and the actions sit on the page (`--surface`); in the editor the formatting toolbar takes a soft step of `--note-header` (55% of it over the page). With the sidebar hidden, one note on its own, the header and the editor's toolbar are `--note-header`, a neutral gray a shade off the page: `#f7f7f7` in the light theme, `#222` in the dark one.

**Editor header**: the view controls (Markdown and HTML preview, the side panel) sit with Cancel and Save, so the formatting toolbar holds only content tools, in one row at the default window size: the text style, bold to strikethrough, the two colors and the four alignments in view, then the rarer tools in `.toolbar-menu`s (font and size, lists, Insert with the link), a button with a small caret whose popover opens under it (a row of icons, a list with names, or labelled fields); it wraps to a second row in a narrow window.

**Dictation** (the microphone button after the link): at rest a plain toolbar button; recording, an error-tinted button with a stop icon and a soft pulse (none with reduced motion) and the time beside it; while the speech turns into text, a spinner and "Turning into text…". The first use also shows the model's download percentage beside it.

**Sidebar footer**: Settings fills the row; the archive and the note graph (pages, not list filters) sit beside it as 36px icon buttons in `--text-muted`, an accent tint while their page is open.

**App icon** (`assets/icons/source/capnote.svg`, rendered by `npm run icons`): a capsule, after the name, with no tile and in one flat color (`#F59E0B`, the default accent), like the app's solid icons: turned 45 degrees, one half solid with a highlight cut out of it, the other its outline. Simple enough to stay sharp at 16px, so every size, the sidebar's 28px among them, is drawn from it.

**Toast**: `--surface-raised`, bottom center, its icon colored by kind.

**Quick note window** (`quick-note.html`, `css/quick-note.css`): 360×300, frameless and always on top in the bottom right corner of the screen. One `--surface` with a 1px `--divider` ring: a drag bar (the app's mark, the name in `--text-secondary` 12/600, open in the app and close as `.btn-icon-xs`), a 16/600 title and the text without borders, then a footer above a divider with the keys in `--text-muted` 11px and a small primary Save, off while the note is empty. It takes the app's theme, accent and language.

**Note graph** (`17-screens.css`, opened from the sidebar footer): the map fills the page under the header. Dots are notes in `--accent-color` (a note without links in `--text-muted`), 5px plus 2px for each link up to 14px, with a 2px `--surface` ring; links are 1.5px lines in `--text-muted` at 35%. Labels are 12px `--text-secondary` with a `--surface` halo, every note's up to 40 dots and only the most linked ones past that. Hovering or focusing a note fades the others to 20% and draws its links in the accent. A Linked/All segmented control and a center button sit in the header; with no links the page shows an empty state. Its icon is Font Awesome's `fa-circle-nodes` (three linked notes), like the icons beside it.

## 10. Checking a change

- `npm test` for behaviour, `npm run test:visual` for every screen in both themes (compare with `tests/visual/accepted`, accept with `--accept` once reviewed).
- Look at light and dark mode. A change that only works in one theme is not done.
- Check that new UI uses existing components and tokens; a new component is added here first.
