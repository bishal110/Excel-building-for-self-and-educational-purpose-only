import { useSyncExternalStore } from 'react';
import { slidesStore } from './slidesStore';

export function useSlidesVersion(): number {
  return useSyncExternalStore(
    slidesStore.subscribe,
    slidesStore.getVersion,
    slidesStore.getVersion,
  );
}
