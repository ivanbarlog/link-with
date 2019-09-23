type CleanupFunction = () => void | Promise<void>;

export const cleanups = new Set<CleanupFunction>();
