/**
 * Minimal ambient declarations for the Spindle backend `spindle` global.
 * Only the surfaces this extension uses are declared.
 */

export {};

declare global {
  interface SpindleStorage {
    read(path: string): Promise<string>;
    write(path: string, data: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    getJson<T>(path: string, options?: { fallback?: T }): Promise<T>;
    setJson(path: string, value: unknown, options?: { indent?: number }): Promise<void>;
  }

  /** Per-user isolated storage. For user-scoped extensions `userId` is inferred;
   * for operator-scoped extensions it must be supplied. */
  interface SpindleUserStorage {
    read(path: string, userId?: string): Promise<string>;
    write(path: string, data: string, userId?: string): Promise<void>;
    exists(path: string, userId?: string): Promise<boolean>;
    getJson<T>(path: string, options?: { fallback?: T; userId?: string }): Promise<T>;
    setJson(path: string, value: unknown, options?: { indent?: number; userId?: string }): Promise<void>;
  }

  interface SpindleLog {
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
  }

  interface SpindleApi {
    log: SpindleLog;
    storage: SpindleStorage;
    userStorage: SpindleUserStorage;
    sendToFrontend(payload: unknown, userId?: string): void;
    onFrontendMessage(
      handler: (payload: unknown, userId: string) => void | Promise<void>
    ): () => void;
  }

  const spindle: SpindleApi;
}
