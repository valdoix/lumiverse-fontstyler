/**
 * Minimal ambient declarations for the Spindle frontend context (`ctx`).
 * Modeled on the documented frontend API surface this extension uses.
 */

export {};

declare global {
  interface SpindleFrontendDom {
    /** Inject scoped CSS. Returns a remover. */
    addStyle(css: string): () => void;
    /** Query a single element within the extension-owned host DOM. */
    query(selector: string): HTMLElement | null;
    /** Remove all DOM/styles this extension created. */
    cleanup(): void;
  }

  interface SpindleFrontendEvents {
    on(event: string, handler: (payload: unknown) => void): () => void;
  }

  interface SpindleDrawerTabOptions {
    id: string;
    title: string;
    shortName?: string;
    description?: string;
    keywords?: string[];
    headerTitle?: string;
    iconSvg?: string;
    iconUrl?: string;
  }

  interface SpindleDrawerTabHandle {
    root: HTMLElement;
    tabId: string;
    setBadge(text: string | null): void;
    activate(): void;
    destroy(): void;
    onActivate(handler: () => void): () => void;
  }

  interface SpindleConfirmOptions {
    title: string;
    message: string;
    variant?: "info" | "warning" | "danger" | "success";
    confirmLabel?: string;
    cancelLabel?: string;
  }

  interface SpindleFrontendUi {
    registerDrawerTab(options: SpindleDrawerTabOptions): SpindleDrawerTabHandle;
    showConfirm(options: SpindleConfirmOptions): Promise<{ confirmed: boolean }>;
  }

  interface SpindleFrontendContext {
    dom: SpindleFrontendDom;
    ui: SpindleFrontendUi;
    events: SpindleFrontendEvents;
    /** Send a JSON-serializable message to the backend runtime. */
    sendToBackend(payload: unknown): void;
    /** Receive messages from the backend runtime. Returns an unsubscribe fn. */
    onBackendMessage(handler: (payload: unknown) => void): () => void;
  }
}
