import { Modal, Setting } from "obsidian";
import { t } from "../i18n";
import { TranslationKey } from "../i18n/en";
import { BoardHost } from "../view/board-host";
import { RowPanel } from "./row-panel";
import { StatusPanel } from "./status-panel";
import { TagPanel } from "./tag-panel";

export type ManagerTab = "statuses" | "row" | "tags";

interface Named {
  name: string;
  color: string;
}

function same(left: Named[], right: Named[]): boolean {
  if (left.length !== right.length) return false;
  return left.every(
    (item, index) => item.name === right[index].name && item.color === right[index].color
  );
}

interface Pane {
  key: ManagerTab;
  label: TranslationKey;
  body: HTMLElement;
  button: HTMLElement;
}

export class ManagerModal extends Modal {
  private readonly statusPanel: StatusPanel;
  private readonly rowPanel: RowPanel;
  private readonly tagPanel: TagPanel;
  private readonly panes: Pane[] = [];

  constructor(
    private readonly host: BoardHost,
    private readonly initial: ManagerTab
  ) {
    super(host.app);

    const statusCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    for (const group of host.groups) {
      statusCounts[group.status.name] = group.tasks.length;
      for (const task of group.tasks) {
        for (const name of task.tags) tagCounts[name] = (tagCounts[name] ?? 0) + 1;
      }
    }

    this.statusPanel = new StatusPanel(
      host.app,
      {
        statuses: host.config.statuses,
        archive: host.config.archive,
        unassigned: host.config.unassigned,
        unassignedIndex: host.config.unassignedIndex
      },
      statusCounts
    );
    this.rowPanel = new RowPanel(host.app, host);
    this.tagPanel = new TagPanel(host.app, host.config.tags, tagCounts);
  }

  onOpen(): void {
    this.titleEl.setText(t("MANAGE_BOARD"));
    this.modalEl.addClass("tl-status-modal");
    this.modalEl.addClass("tl-manager-modal");

    const tabs = this.contentEl.createDiv({ cls: "tl-tabs" });
    const bodies = this.contentEl.createDiv({ cls: "tl-tab-bodies" });

    this.addPane(tabs, bodies, "statuses", "MANAGE_STATUSES");
    this.addPane(tabs, bodies, "row", "MANAGE_ROW");
    this.addPane(tabs, bodies, "tags", "MANAGE_TAGS");

    this.statusPanel.mount(this.pane("statuses").body);
    this.rowPanel.mount(this.pane("row").body);
    this.tagPanel.mount(this.pane("tags").body);

    this.select(this.initial);

    new Setting(this.contentEl)
      .addButton((button) =>
        button.setButtonText(t("CANCEL")).onClick(() => {
          this.close();
        })
      )
      .addButton((button) =>
        button
          .setButtonText(t("SAVE"))
          .setCta()
          .onClick(() => this.save())
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private addPane(
    tabs: HTMLElement,
    bodies: HTMLElement,
    key: ManagerTab,
    label: TranslationKey
  ): void {
    const button = tabs.createEl("button", { cls: "tl-tab", text: t(label) });
    button.type = "button";
    button.addEventListener("click", () => {
      this.select(key);
    });

    const body = bodies.createDiv({ cls: "tl-tab-body" });
    this.panes.push({ key, label, body, button });
  }

  private pane(key: ManagerTab): Pane {
    const found = this.panes.find((pane) => pane.key === key);
    if (found === undefined) throw new Error(`Unknown tab: ${key}`);
    return found;
  }

  private select(key: ManagerTab): void {
    for (const pane of this.panes) {
      const active = pane.key === key;
      pane.button.toggleClass("is-active", active);
      pane.body.toggleClass("is-active", active);
    }
  }

  private save(): void {
    const statuses = this.statusPanel.collect();
    if (statuses === null) {
      this.select("statuses");
      return;
    }

    const tags = this.tagPanel.collect();
    if (tags === null) {
      this.select("tags");
      return;
    }

    const config = this.host.config;
    const statusesChanged =
      statuses.migration.renames.length > 0 ||
      statuses.migration.removals.length > 0 ||
      statuses.unassignedIndex !== config.unassignedIndex ||
      !same(statuses.statuses, config.statuses) ||
      !same([statuses.archive, statuses.unassigned], [config.archive, config.unassigned]);

    const tagsChanged =
      tags.migration.renames.length > 0 ||
      tags.migration.removals.length > 0 ||
      !same(tags.tags, config.tags);

    const rowChanged = this.rowPanel.changed(this.host);
    const row = this.rowPanel.collect();

    this.close();
    if (statusesChanged) this.host.applyStatuses(statuses);
    if (rowChanged) this.host.applyRow(row);
    if (tagsChanged) this.host.applyTags(tags);
  }
}
