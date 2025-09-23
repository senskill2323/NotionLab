/**
 * Perfect Negotiation helper encapsulating RTCPeerConnection creation and flag state.
 * Inspired by https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
 */
export type PerfectNegotiatorState = {
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  isSettingRemoteAnswerPending: boolean;
};

type LogLevel = "debug" | "info" | "warn" | "error";
type LogFn = (level: LogLevel, message: string, data?: unknown) => void;

export type PerfectNegotiatorHandlers = {
  onPeerCreated?: (context: { peer: RTCPeerConnection; config: RTCConfiguration }) => void;
  onTrack?: (event: RTCTrackEvent, context: { peer: RTCPeerConnection }) => void;
  onDataChannel?: (event: RTCDataChannelEvent, context: { peer: RTCPeerConnection }) => void;
  onIceCandidate?: (event: RTCPeerConnectionIceEvent, context: { peer: RTCPeerConnection }) => void;
  onIceCandidateError?: (
    event: RTCPeerConnectionIceErrorEvent,
    context: { peer: RTCPeerConnection }
  ) => void;
  onNegotiationNeeded?: (context: { peer: RTCPeerConnection }) => void;
  onConnectionStateChange?: (
    state: RTCPeerConnectionState,
    context: { peer: RTCPeerConnection }
  ) => void;
};

export interface PerfectNegotiatorOptions {
  polite?: boolean;
  rtcConfig?: RTCConfiguration;
  createPeerConnection?: (config: RTCConfiguration) => RTCPeerConnection;
  log?: LogFn;
  handlers?: PerfectNegotiatorHandlers;
}

export interface EnsurePeerResult {
  peer: RTCPeerConnection;
  created: boolean;
}

export class PerfectNegotiator {
  private peer: RTCPeerConnection | null = null;
  private readonly state: PerfectNegotiatorState;
  private readonly log?: LogFn;
  private readonly createPeer: (config: RTCConfiguration) => RTCPeerConnection;
  private readonly handlers: PerfectNegotiatorHandlers;
  private readonly defaultConfig?: RTCConfiguration;
  private lastConfig?: RTCConfiguration;

  constructor(options: PerfectNegotiatorOptions = {}) {
    const { polite = true, rtcConfig, createPeerConnection, log, handlers } = options;

    this.state = {
      polite,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
    };

    this.log = log;
    this.createPeer = createPeerConnection ?? ((config) => new RTCPeerConnection(config));
    this.defaultConfig = rtcConfig;
    this.handlers = {
      onPeerCreated: undefined,
      onTrack: undefined,
      onDataChannel: undefined,
      onIceCandidate: undefined,
      onIceCandidateError: undefined,
      onNegotiationNeeded: undefined,
      onConnectionStateChange: undefined,
      ...(handlers ?? {}),
    };
  }

  get polite(): boolean {
    return this.state.polite;
  }

  get flags(): PerfectNegotiatorState {
    return { ...this.state };
  }

  updateFlags(partial: Partial<PerfectNegotiatorState>): void {
    Object.assign(this.state, partial);
  }

  ensurePeerConnection(
    config?: RTCConfiguration,
    handlers?: Partial<PerfectNegotiatorHandlers>
  ): EnsurePeerResult {
    if (handlers) {
      this.setHandlers(handlers);
    }

    const nextConfig = config ?? this.lastConfig ?? this.defaultConfig;
    if (!nextConfig) {
      throw new Error("No RTCConfiguration provided to PerfectNegotiator");
    }

    const shouldCreate =
      !this.peer || this.isPeerClosed(this.peer) || this.lastConfig !== nextConfig;

    if (shouldCreate) {
      if (this.peer) {
        this.safeClose(this.peer);
      }

      this.peer = this.createPeer(nextConfig);
      this.lastConfig = nextConfig;

      if (this.handlers.onPeerCreated) {
        try {
          this.handlers.onPeerCreated({ peer: this.peer, config: nextConfig });
        } catch (error) {
          this.log?.("warn", "PerfectNegotiator onPeerCreated handler failed", { error });
        }
      }

      this.applyHandlers(this.peer);
      this.log?.("debug", "PerfectNegotiator created RTCPeerConnection");

      return { peer: this.peer, created: true };
    }

    if (handlers) {
      this.applyHandlers(this.peer);
    }

    if (!this.peer) {
      throw new Error("PerfectNegotiator failed to acquire RTCPeerConnection");
    }

    return { peer: this.peer, created: false };
  }

  setHandlers(handlers: Partial<PerfectNegotiatorHandlers>): void {
    Object.assign(this.handlers, handlers);
    if (this.peer) {
      this.applyHandlers(this.peer);
    }
  }

  getPeer(): RTCPeerConnection | null {
    return this.peer;
  }

  close(): void {
    if (this.peer) {
      this.safeClose(this.peer);
      this.peer = null;
    }
    this.resetFlags();
  }

  resetFlags(): void {
    this.state.makingOffer = false;
    this.state.ignoreOffer = false;
    this.state.isSettingRemoteAnswerPending = false;
  }

  private applyHandlers(peer: RTCPeerConnection | null): void {
    if (!peer) return;

    if (Object.prototype.hasOwnProperty.call(this.handlers, "onTrack")) {
      const handler = this.handlers.onTrack;
      peer.ontrack = handler ? (event) => handler(event, { peer }) : null;
    }

    if (Object.prototype.hasOwnProperty.call(this.handlers, "onDataChannel")) {
      const handler = this.handlers.onDataChannel;
      peer.ondatachannel = handler ? (event) => handler(event, { peer }) : null;
    }

    if (Object.prototype.hasOwnProperty.call(this.handlers, "onIceCandidate")) {
      const handler = this.handlers.onIceCandidate;
      peer.onicecandidate = handler ? (event) => handler(event, { peer }) : null;
    }

    if (Object.prototype.hasOwnProperty.call(this.handlers, "onIceCandidateError")) {
      const handler = this.handlers.onIceCandidateError;
      peer.onicecandidateerror = handler ? (event) => handler(event, { peer }) : null;
    }

    if (Object.prototype.hasOwnProperty.call(this.handlers, "onNegotiationNeeded")) {
      const handler = this.handlers.onNegotiationNeeded;
      peer.onnegotiationneeded = handler ? () => handler({ peer }) : null;
    }

    if (Object.prototype.hasOwnProperty.call(this.handlers, "onConnectionStateChange")) {
      const handler = this.handlers.onConnectionStateChange;
      peer.onconnectionstatechange = handler
        ? () => handler(peer.connectionState, { peer })
        : null;
    }
  }

  private isPeerClosed(peer: RTCPeerConnection): boolean {
    const closedState =
      peer.connectionState === "closed" || peer.connectionState === "failed";
    const signalingClosed = peer.signalingState === "closed";
    return closedState || signalingClosed;
  }

  private safeClose(peer: RTCPeerConnection): void {
    try {
      peer.close();
    } catch (error) {
      this.log?.("warn", "PerfectNegotiator peer close failed", { error });
    }
  }
}
