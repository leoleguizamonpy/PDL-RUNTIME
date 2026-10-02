import { initCursor } from "./js/cursor.js";
import { initSidebar, initTabs, initDisclosure } from "./js/runtime.js";
import { initMenus } from "./js/menus.js";
import { initUploadZones } from "./js/upload.js";
import { initTableControls } from "./js/data-controls.js";
import { initDataGrids } from "./js/data-grid.js";
import { initFileBrowsers } from "./js/file-browser.js";
import { initOverlays } from "./js/overlays.js";
import { initAdvancedOverlays } from "./js/overlay-advanced.js";
import { initAdvancedForms, initSegmented, initRanges, initComboboxes, initTagInputs } from "./js/forms-advanced.js";
import { initFormFlows } from "./js/form-flow.js";
import { initNotifications, createToast, createResponseDialog, showFeedback } from "./js/notifications.js";
import { initPageMotion, withViewTransition } from "./js/motion.js";
import { initLoading, showSplash, dismissSplash, withSplashTransition, setBusy } from "./js/loading.js";
import { initKanban } from "./js/temporal.js";
import { initResizableWorkspaces } from "./js/workspace.js";

export {
  initCursor,
  initSidebar,
  initTabs,
  initDisclosure,
  initMenus,
  initUploadZones,
  initTableControls,
  initDataGrids,
  initFileBrowsers,
  initOverlays,
  initAdvancedOverlays,
  initAdvancedForms,
  initSegmented,
  initRanges,
  initComboboxes,
  initTagInputs,
  initFormFlows,
  initNotifications,
  createToast,
  createResponseDialog,
  showFeedback,
  initPageMotion,
  withViewTransition,
  initLoading,
  showSplash,
  dismissSplash,
  withSplashTransition,
  setBusy,
  initKanban,
  initResizableWorkspaces
};

export function initPDL(options = {}) {
  const root = options.root ?? document;
  const instances = [
    initSidebar(root),
    initTabs(root),
    initDisclosure(root),
    initMenus(root),
    initUploadZones(root),
    initTableControls(root),
    initDataGrids(root),
    initFileBrowsers(root),
    initOverlays(root),
    initAdvancedOverlays(root),
    initAdvancedForms(root),
    initFormFlows(root),
    initNotifications(root),
    initKanban(root),
    initResizableWorkspaces(root),
    initPageMotion(root),
    initLoading(root),
    initCursor({ root, enabled: options.cursor !== false })
  ];

  return {
    destroy() {
      for (const instance of instances.reverse()) instance?.destroy?.();
    }
  };
}

export * from "./app/index.js";
