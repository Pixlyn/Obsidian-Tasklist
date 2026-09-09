import { App, Setting } from "obsidian";
import { LANGUAGE_NAMES, LANGUAGES, SYSTEM_LANGUAGE, t } from "../i18n";
import {
  clampSearchDelay,
  isSearchMode,
  isStatusDot,
  MAX_SEARCH_DELAY,
  MIN_SEARCH_DELAY,
  SettingsStore
} from "../settings";
import { STATUS_PALETTE } from "../model/status";

export function renderSettings(container: HTMLElement, store: SettingsStore, app: App): void {
  container.empty();

  const save = (): void => {
    void store.saveSettings();
  };

  new Setting(container)
    .setName(t("SETTINGS_LANGUAGE"))
    .setDesc(t("SETTINGS_LANGUAGE_DESC"))
    .addDropdown((dropdown) => {
      dropdown.addOption(SYSTEM_LANGUAGE, t("SETTINGS_LANGUAGE_SYSTEM"));
      for (const code of LANGUAGES) dropdown.addOption(code, LANGUAGE_NAMES[code] ?? code);

      dropdown.setValue(store.settings.language).onChange((value) => {
        store.settings.language = value;
        save();
        renderSettings(container, store, app);
      });
    });

  new Setting(container)
    .setName(t("SETTINGS_MOVE_FILES"))
    .setDesc(t("SETTINGS_MOVE_FILES_DESC"))
    .addToggle((toggle) =>
      toggle.setValue(store.settings.moveFiles).onChange((value) => {
        store.settings.moveFiles = value;
        save();
      })
    );

  new Setting(container)
    .setName(t("SETTINGS_OPEN_ON_CREATE"))
    .setDesc(t("SETTINGS_OPEN_ON_CREATE_DESC"))
    .addToggle((toggle) =>
      toggle.setValue(store.settings.openOnCreate).onChange((value) => {
        store.settings.openOnCreate = value;
        save();
      })
    );

  new Setting(container)
    .setName(t("SETTINGS_CONFIRM_DELETE"))
    .setDesc(t("SETTINGS_CONFIRM_DELETE_DESC"))
    .addToggle((toggle) =>
      toggle.setValue(store.settings.confirmDelete).onChange((value) => {
        store.settings.confirmDelete = value;
        save();
      })
    );

  new Setting(container)
    .setName(t("KEEP_ADDING"))
    .setDesc(t("KEEP_ADDING_DESC"))
    .addToggle((toggle) =>
      toggle.setValue(store.settings.keepAdding).onChange((value) => {
        store.settings.keepAdding = value;
        save();
      })
    );

  new Setting(container)
    .setName(t("SETTINGS_STATUS_DOT"))
    .setDesc(t("SETTINGS_STATUS_DOT_DESC"))
    .then((setting) => {
      const preview = setting.controlEl.createDiv({ cls: "tl-dot-preview" });

      const draw = (): void => {
        preview.empty();
        for (const status of STATUS_PALETTE.slice(0, 3)) {
          const dot = preview.createDiv({ cls: "tl-dot-sample" });
          dot.style.borderColor = status;
          if (store.settings.statusDot === "filled") dot.style.background = status;
        }
      };

      setting.addDropdown((dropdown) =>
        dropdown
          .addOption("outline", t("SETTINGS_STATUS_DOT_OUTLINE"))
          .addOption("filled", t("SETTINGS_STATUS_DOT_FILLED"))
          .setValue(store.settings.statusDot)
          .onChange((value) => {
            if (!isStatusDot(value)) return;
            store.settings.statusDot = value;
            save();
            draw();
          })
      );

      setting.controlEl.insertBefore(preview, setting.controlEl.firstChild);
      draw();
    });

  const delaySetting = new Setting(container)
    .setName(t("SETTINGS_SEARCH_DELAY"))
    .setDesc(t("SETTINGS_SEARCH_DELAY_DESC"));

  const showDelay = (): void => {
    delaySetting.settingEl.toggle(store.settings.searchMode === "type");
  };

  new Setting(container)
    .setName(t("SETTINGS_SEARCH_MODE"))
    .setDesc(t("SETTINGS_SEARCH_MODE_DESC"))
    .addDropdown((dropdown) =>
      dropdown
        .addOption("type", t("SETTINGS_SEARCH_MODE_TYPE"))
        .addOption("enter", t("SETTINGS_SEARCH_MODE_ENTER"))
        .setValue(store.settings.searchMode)
        .onChange((value) => {
          if (!isSearchMode(value)) return;
          store.settings.searchMode = value;
          save();
          showDelay();
        })
    );

  delaySetting.settingEl.detach();
  container.appendChild(delaySetting.settingEl);

  delaySetting.addSlider((slider) =>
    slider
      .setLimits(MIN_SEARCH_DELAY, MAX_SEARCH_DELAY, 100)
      .setValue(store.settings.searchDelay)
      .onChange((value) => {
        store.settings.searchDelay = clampSearchDelay(value);
        save();
      })
  );

  showDelay();
}
