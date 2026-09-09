import { Plugin, PluginSettingTab } from "obsidian";
import { SettingsStore } from "../settings";
import { renderSettings } from "./settings-view";

type SettingsPlugin = Plugin & SettingsStore;

export class TaskListSettingTab extends PluginSettingTab {
  constructor(private readonly store: SettingsPlugin) {
    super(store.app, store);
  }

  display(): void {
    renderSettings(this.containerEl, this.store, this.app);
  }
}
