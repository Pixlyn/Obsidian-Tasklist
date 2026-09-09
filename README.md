# TaskList

Status-grouped task board for [Obsidian](https://obsidian.md). Every task is a plain
markdown note; the board is just a view over a folder, so nothing is locked into a
proprietary database.

<img width="1919" height="987" alt="image" src="https://github.com/user-attachments/assets/604b7cbd-9014-4714-8f7f-f51e332dcdc5" />

## Features

- **Status groups** — collapsible groups with custom names and colors, plus a built-in
  _Unassigned_ group and an _Archive_ group at the bottom.
- **Folder sync** — changing a task's status moves its note into the matching subfolder
  (`Tasks/Todo`, `Tasks/Archive`, …). Can be turned off with `moveFiles: false`.
- **Drag and drop** — reorder tasks inside a group or drag them between groups; the
  order is persisted to the `order` frontmatter property.
- **Inline editing** — rename, change status, priority, tags and dates directly from the
  row without opening the note.
- **Columns** — `status`, `name`, `tags`, `priority`, `created`, `due`; reorder, hide,
  and resize them.
- **Custom fields** — add your own columns of type `text`, `number`, `date`, `time` or
  `toggle`; each is stored as a frontmatter property.
- **Tags & priority** — colored tags, and four priority levels (urgent / high / normal / low).
- **Search** — pick a field and the input follows it: free text for the name, a colored
  list for tags, status and priority, a date picker for due and created dates.
- **Bulk actions** — multi-select rows to change status or delete in one step.
- **12 languages** — ar, de, en, es, fr, it, ja, ko, pt, ru, tr, zh. Follows Obsidian's
  language by default, or pick one in the settings.

## Installation

### Manual

1. Download `main.js`, `manifest.json` and `styles.css` from the
   [latest release](../../releases/latest).
2. Copy them into `<vault>/.obsidian/plugins/tasklist-board/`.
3. Reload Obsidian and enable **TaskList** in _Settings → Community plugins_.

Requires Obsidian `1.13.0` or newer. Works on desktop and mobile.

## Usage

Create a board with the **TaskList: New board** command, or right-click a folder in the
file explorer and choose **New board**. A board note is created together with its tasks
folder, and it opens in the board view automatically.

A board is a normal note containing a `tasklist` code block:

````markdown
```tasklist
folder: "Tasks"
statuses:
  - name: "Todo"
    color: "#3b7dd8"
  - name: "In Progress"
    color: "#d98c3b"
  - name: "Completed"
    color: "#3f9d5a"
```
````

### Block options

| Key                | Type    | Default         | Description                                |
| ------------------ | ------- | --------------- | ------------------------------------------ |
| `folder`           | string  | — (required)    | Folder scanned for task notes.             |
| `statuses`         | list    | Todo, Completed | Status name + color pairs, in board order. |
| `archive`          | string  | `Archive`       | Name of the archive group.                 |
| `archiveColor`     | string  | `#6b7280`       | Archive group color.                       |
| `archiveFolder`    | string  | `Archive`       | Subfolder used for archived tasks.         |
| `unassigned`       | string  | `Unassigned`    | Group for notes without a valid status.    |
| `unassignedColor`  | string  | `#6b7280`       | Unassigned group color.                    |
| `unassignedFolder` | string  | `Unassigned`    | Subfolder for unassigned tasks.            |
| `unassignedIndex`  | number  | `0`             | Position of the unassigned group.          |
| `moveFiles`        | boolean | `true`          | Move the note when its status changes.     |
| `note`             | string  | —               | Free-text note shown on the board.         |
| `tags`             | list    | —               | Tag name + color pairs.                    |
| `fields`           | list    | —               | Custom fields (`key`, `name`, `type`).     |
| `columns`          | list    | all builtins    | Column order.                              |
| `hidden`           | list    | `[created]`     | Columns hidden from the board.             |

Most of these can be edited from the board UI instead of by hand — the block is
rewritten for you.

### Task notes

A task is a markdown note in the board folder. Everything lives in frontmatter:

```yaml
---
status: Todo
priority: high
tags: [design, backend]
due: 2026-09-30
created: 2026-09-09
order: 0
---
```

Because the data is plain frontmatter, tasks stay readable, searchable and usable by
Dataview or any other plugin.

## Settings

The gear in the board's title bar and _Settings → TaskList_ show the same preferences,
and both save immediately.

| Setting           | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| Language          | Follows Obsidian by default; any of the 12 languages can be forced.      |
| Task folder       | Where new lists keep their tasks, picked with **Browse**.                |
| Move notes        | Whether a note follows its status into that status's folder (new lists). |
| Open new tasks    | Open the note right after a task is created.                             |
| Confirm delete    | Ask before deleting tasks.                                               |
| Keep adding       | Keep the inline add row open after saving a task.                        |
| Status marker     | Draw the status circle as an outline or filled, with a live preview.     |
| Search preference | Automatic (as you type) or manual (on Enter).                            |
| Search delay      | Pause after the last keystroke before filtering, in ms (default 1000).   |

The board gear also carries one board-only setting, **This list's folder**: it points the
list at another folder without moving the notes that are already there. A new list always
starts with a `Tasks` folder beside its note.

## Development

```bash
pnpm install
pnpm dev      # watch build
pnpm build    # typecheck + production build
pnpm check    # format check + lint + typecheck
```

Built with esbuild and TypeScript.

## License

[MIT](LICENSE) © Pixlyn
