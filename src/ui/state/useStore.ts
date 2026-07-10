import { useSyncExternalStore } from 'react';
import { store } from './store';

/** Re-render the calling component whenever the store changes. */
export function useStoreVersion(): number {
  return useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion);
}
