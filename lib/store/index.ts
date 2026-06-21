import { MemoryStore } from "@/lib/store/memory";

const globalForStore = globalThis as typeof globalThis & {
  __codesentinelStore?: MemoryStore;
};

export const store = globalForStore.__codesentinelStore ?? new MemoryStore();

globalForStore.__codesentinelStore = store;
