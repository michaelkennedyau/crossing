/**
 * One frame context, passed to every animator (handover §4). The whole experience hangs off these
 * scalars — one ticker, one scroll driver, one dawn variable.
 */
export interface FrameCtx {
  t: number; // performance.now()
  dt: number; // ms since last frame, clamped
  progress: number; // scroll 0..1 — the spine
  dawn: number; // eased progress → colour temperature 0..1
  quiet: number; // 0..1, spikes inside the Lago Frías "engine cut"
  reduced: boolean;
}

export type Animator = (ctx: FrameCtx) => void;
