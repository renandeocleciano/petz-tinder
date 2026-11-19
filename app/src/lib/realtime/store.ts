import { create } from 'zustand';

interface RealtimeState {
  /** True while the inbox channel is subscribed; screens stop polling then. */
  live: boolean;
  setLive: (live: boolean) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  live: false,
  setLive: (live) => set({ live }),
}));
