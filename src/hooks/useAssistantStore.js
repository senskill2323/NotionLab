import { create } from 'zustand';

export const useAssistantStore = create((set, get) => ({
  // UI state
  isOpen: false,
  minimized: false,

  // Media state
  micOn: false,
  camOn: false,
  localStream: null,
  remoteStream: null,

  // Realtime state (explicit state machine)
  // idle → connecting → connected → reconnecting → failed | disconnected
  connectionState: 'idle', // 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'disconnected'
  lastDisconnectAt: null,

  // Conversation
  transcript: '',
  messages: [], // {role: 'user'|'assistant'|'system', content: string, sources?: []}
  error: null,

  // Actions
  openDrawer: () => set({ isOpen: true, minimized: false }),
  closeDrawer: () => set({ isOpen: false }),
  toggleDrawer: () => set({ isOpen: !get().isOpen }),
  toggleWidget: () => set({ minimized: !get().minimized }),

  setMic: (on) => set({ micOn: on }),
  setCam: (on) => set({ camOn: on }),
  toggleMic: () => set({ micOn: !get().micOn }),
  toggleCam: () => set({ camOn: !get().camOn }),

  setLocalStream: (s) => set({ localStream: s }),
  setRemoteStream: (s) => set({ remoteStream: s }),

  setConnectionState: (state) => set({ connectionState: state, lastDisconnectAt: state === 'disconnected' ? Date.now() : get().lastDisconnectAt }),
  setStateIdle: () => set({ connectionState: 'idle' }),
  setStateConnecting: () => set({ connectionState: 'connecting' }),
  setStateConnected: () => set({ connectionState: 'connected' }),
  setStateReconnecting: () => set({ connectionState: 'reconnecting' }),
  setStateFailed: () => set({ connectionState: 'failed' }),

  setTranscript: (t) => set({ transcript: t }),
  appendTranscript: (t) => set({ transcript: (get().transcript || '') + t }),

  pushMessage: (msg) => set({ messages: [...get().messages, msg] }),

  setError: (err) => set({ error: err }),
  resetError: () => set({ error: null }),

  reset: () => set({
    isOpen: false,
    minimized: false,
    micOn: false,
    camOn: false,
    localStream: null,
    remoteStream: null,
    connectionState: 'idle',
    transcript: '',
    messages: [],
    error: null,
  }),
}));
