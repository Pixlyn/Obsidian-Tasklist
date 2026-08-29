import { Plugin, PluginSettingTab, Setting } from "obsidian";
import { t } from "../i18n";
import { DEFAULT_TASKS_FOLDER, normalizeTasksFolder, SettingsStore } from "../settings";

type SettingsPlugin = Plugin & SettingsStore;

export class TaskListSettingTab extends PluginSettingTab {
  constructor(private readonly store: SettingsPlugin) {
    super(store.app, store);
  }

  display(): void {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName(t("SETTINGS_TASKS_FOLDER"))
      .setDesc(t("SETTINGS_TASKS_FOLDER_DESC"))
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_TASKS_FOLDER)
          .setValue(this.store.settings.tasksFolder)
          .onChange((value) => {
            this.store.settings.tasksFolder = normalizeTasksFolder(value);
            void this.store.saveSettings();
          })
      );

    new Setting(this.containerEl)
      .setName(t("SETTINGS_MOVE_FILES"))
      .setDesc(t("SETTINGS_MOVE_FILES_DESC"))
      .addToggle((toggle) =>
        toggle.setValue(this.store.settings.moveFiles).onChange((value) => {
          this.store.settings.moveFiles = value;
          void this.store.saveSettings();
        })
      );

    new Setting(this.containerEl)
      .setName(t("SETTINGS_OPEN_ON_CREATE"))
      .setDesc(t("SETTINGS_OPEN_ON_CREATE_DESC"))
      .addToggle((toggle) =>
        toggle.setValue(this.store.settings.openOnCreate).onChange((value) => {
          this.store.settings.openOnCreate = value;
          void this.store.saveSettings();
        })
      );

    new Setting(this.containerEl)
      .setName(t("SETTINGS_CONFIRM_DELETE"))
      .setDesc(t("SETTINGS_CONFIRM_DELETE_DESC"))
      .addToggle((toggle) =>
        toggle.setValue(this.store.settings.confirmDelete).onChange((value) => {
          this.store.settings.confirmDelete = value;
          void this.store.saveSettings();
        })
      );

    new Setting(this.containerEl)
      .setName(t("KEEP_ADDING"))
      .setDesc(t("KEEP_ADDING_DESC"))
      .addToggle((toggle) =>
        toggle.setValue(this.store.settings.keepAdding).onChange((value) => {
          this.store.settings.keepAdding = value;
          void this.store.saveSettings();
        })
      );
  }
}
