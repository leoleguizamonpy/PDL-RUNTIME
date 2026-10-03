export interface PDLDestroyable {
  destroy?: () => void;
}

export interface PDLInitOptions {
  root?: Document | HTMLElement;
  cursor?: boolean;
}

export interface PDLRuntimeInstance {
  destroy(): void;
}

export declare function initPDL(options?: PDLInitOptions): PDLRuntimeInstance;

export declare function initCursor(options?: {
  root?: Document | HTMLElement;
  enabled?: boolean;
}): PDLDestroyable;

export declare function initSidebar(root?: Document | HTMLElement): PDLDestroyable;
export declare function initTabs(root?: Document | HTMLElement): PDLDestroyable;
export declare function initDisclosure(root?: Document | HTMLElement): PDLDestroyable;
export declare function initMenus(root?: Document | HTMLElement): PDLDestroyable;
export declare function initUploadZones(root?: Document | HTMLElement): PDLDestroyable;
export declare function initTableControls(root?: Document | HTMLElement): PDLDestroyable;
export declare function initDataGrids(root?: Document | HTMLElement): PDLDestroyable;
export declare function initFileBrowsers(root?: Document | HTMLElement): PDLDestroyable;
export declare function initOverlays(root?: Document | HTMLElement): PDLDestroyable;
export declare function initAdvancedOverlays(root?: Document | HTMLElement): PDLDestroyable;
export declare function initAdvancedForms(root?: Document | HTMLElement): PDLDestroyable;
export declare function initSegmented(root?: Document | HTMLElement): PDLDestroyable;
export declare function initRanges(root?: Document | HTMLElement): PDLDestroyable;
export declare function initComboboxes(root?: Document | HTMLElement): PDLDestroyable;
export declare function initTagInputs(root?: Document | HTMLElement): PDLDestroyable;
export declare function initFormFlows(root?: Document | HTMLElement): PDLDestroyable;
export declare function initNotifications(root?: Document | HTMLElement): PDLDestroyable;
export declare function initPageMotion(root?: Document | HTMLElement): PDLDestroyable;
export declare function initLoading(root?: Document | HTMLElement): PDLDestroyable;
export declare function initKanban(root?: Document | HTMLElement): PDLDestroyable;

export interface PDLSortableMove {
  from: number;
  to: number;
  item: HTMLElement;
  /** True when moved with the arrow keys on its handle. */
  keyboard?: boolean;
}

export interface PDLSortableOptions {
  /** Items: direct children of the list. Default [data-pdl-sortable-item]. */
  item?: string;
  /** Handles any pointer (and the arrow keys) can drag. Default [data-pdl-sortable-handle]. */
  handle?: string;
  /** Extra areas a mouse can drag from; touch keeps them for scrolling. */
  mouseHandle?: string;
  /** Called on drop (or arrow key) with the old and new index. */
  onMove?: (move: PDLSortableMove) => void;
}

export declare function createSortable(list: HTMLElement, options?: PDLSortableOptions): { destroy(): void };
export declare function initSortables(root?: Document | HTMLElement): PDLDestroyable;
export declare function initResizableWorkspaces(root?: Document | HTMLElement): PDLDestroyable;

export declare function createToast(...args: unknown[]): unknown;
export declare function createResponseDialog(...args: unknown[]): unknown;
export declare function showFeedback(...args: unknown[]): unknown;
export declare function withViewTransition<T>(callback: () => T | Promise<T>): Promise<T> | T;
export declare function showSplash(...args: unknown[]): unknown;
export declare function dismissSplash(...args: unknown[]): unknown;
export declare function withSplashTransition<T>(callback: () => T | Promise<T>, ...args: unknown[]): Promise<T> | T;
export declare function setBusy(...args: unknown[]): unknown;
