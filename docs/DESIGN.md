# Capnote design rules

These rules describe how the interface is built. Every change to the interface follows them, and anything that breaks one is a bug. The values live as CSS custom properties in `src/renderer/css/01-base.css` (light theme on `:root`, dark theme on `[data-theme='dark']`); components use the tokens, never raw values.

## 1. No borders

Components are separated by **surface tone, spacing and shadow**, not by lines. Buttons, cards, inputs, badges, menus and dialogs have no border.

Lines are allowed in exactly these places:

- **Region dividers** between the large areas of the window: titlebar / content, sidebar / content, the sidebar's fixed header and footer / its scrolling list, editor toolbar / writing area, editor / editor sidebar, viewer header / note, viewer / its stats bar, settings tabs / settings content. They use `--divider` and are 1px.
- **Note content** the user writes: table cells, blockquotes and horizontal rules.
- **Transient feedback**: the dashed outline while dragging over a drop target, and the dashed outline of a selected image.

States that used to be shown with a border use something else:

| State                 | Shown with                                        |
| --------------------- | ------------------------------------------------- |
| Hover                 | a stronger tint (`--tint-hover`, `--tint-strong`) |
| Keyboard/input focus  | the focus ring `--focus-ring` (a box-shadow)      |
| Active / selected     | accent tint background and accent text            |
| Pinned note           | thumbtack icon in place of the note icon          |
| Unread notification   | accent tint background                            |
| Selected color swatch | `--swatch-ring` (a box-shadow)                    |

## 2. Surfaces

Each surface is one step from the one it sits on. Cards and fields use translucent tints, so they work on any background and in both themes.

| Token                            | Use                                                                    |
| -------------------------------- | ---------------------------------------------------------------------- |
| `--surface`                      | main content background                                                |
| `--surface-sidebar`              | sidebar                                                                |
| `--surface-raised`               | floating things: menus, popovers, dialogs, toasts (with a shadow)      |
| `--card`                         | cards and grouped blocks on a page (todo sections, notification cards) |
| `--field`, `--field-hover`       | inputs, selects, search fields                                         |
| `--tint-hover`, `--tint-strong`  | hover on transparent and on tinted things                              |
| `--accent-color-rgba-10` / `-15` | active and selected backgrounds                                        |

A field inside a card is still `--field`: tints add up, so it stays one step darker than the card.

Floating surfaces get `--shadow-popover` (menus, dropdowns, panels) or `--shadow-modal` (dialogs). Nothing else has a shadow, except the primary button's hover glow.

## 3. Spacing

Everything sits on a **4px grid**. Use the spacing tokens:

| Token        | px  | Typical use                                       |
| ------------ | --- | ------------------------------------------------- |
| `--space-1`  | 4   | icon to text in tight places, between badge items |
| `--space-2`  | 8   | gap between buttons, list item vertical padding   |
| `--space-3`  | 12  | gap inside cards, list item horizontal padding    |
| `--space-4`  | 16  | card padding, gap between cards                   |
| `--space-5`  | 20  | dialog body padding                               |
| `--space-6`  | 24  | dialog padding, section spacing                   |
| `--space-8`  | 32  | page padding of full screens                      |
| `--space-10` | 40  | space below a page header                         |

Rules:

- **Symmetric padding.** Top equals bottom, left equals right, unless something (an icon, a scrollbar) needs room on one side.
- **One edge per region.** Everything in a column starts at the same x: the page title, its subtitle, its controls and its cards share the page padding; inside a card, every row shares the card padding.
- **Equal rhythm.** Repeated items (list rows, cards, setting rows) have equal heights and equal gaps.
- **Control height.** Buttons, inputs and selects next to each other have the same height: 36px normally, 32px for `.btn-small`-sized controls, 44px for `.btn-large`.

## 4. Shape

| Token           | px  | Use                                    |
| --------------- | --- | -------------------------------------- |
| `--radius-sm`   | 4   | small badges, color swatches in a grid |
| `--radius-md`   | 8   | buttons, inputs, list rows, menu items |
| `--radius-lg`   | 12  | cards, menus, panels                   |
| `--radius-xl`   | 16  | dialogs                                |
| `--radius-full` | 999 | pills, toggles, round icon buttons     |

## 5. Buttons

| Class                     | Look                              | Use                                 |
| ------------------------- | --------------------------------- | ----------------------------------- |
| `.btn-primary`            | accent fill, white text           | the main action of a view or dialog |
| `.btn-secondary`          | `--field` fill, primary text      | other actions                       |
| `.btn-outline`            | transparent, tint on hover        | low-emphasis actions next to others |
| `.btn-danger`             | red fill                          | confirming a destructive action     |
| `.btn-outline.btn-danger` | red tint fill, red text           | starting a destructive action       |
| `.btn-icon`               | transparent square, tint on hover | toolbars and headers                |

Hover never scales or moves a button.

## 6. Type

Font sizes come from `--fs-xs` (11px) to `--fs-5xl` (32px); weights are 400 (text), 500 (labels, buttons), 600 (titles). Secondary text uses `--text-secondary`, hints and timestamps `--text-muted`.

## 7. Color

The accent (`--accent-color`) marks the active item, the primary action and focus. Red (`--error-color`) is only for destructive actions and errors. No other component colors; folder colors are the user's.

## 8. Checking a change

- `npm test` for behaviour, `npm run test:visual` for every screen in both themes.
- Look at light and dark mode. A change that only works in one theme is not done.
