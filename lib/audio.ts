type AudioContextCtor = typeof AudioContext;

function getAudioContextClass(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ||
    null
  );
}

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  const Ctor = getAudioContextClass();
  if (!Ctor) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  volume = 0.6,
  delaySeconds = 0,
  type: OscillatorType = 'sine'
) {
  try {
    const ctx = getCtx();
    // Safari keeps AudioContext suspended until resume() resolves; skip if not ready.
    if (!ctx || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const start = ctx.currentTime + delaySeconds;
    osc.type = type;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.setValueAtTime(volume, start + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0, start + duration);

    osc.start(start);
    osc.stop(start + duration);
  } catch {
    // AudioContext not available
  }
}

export function beepWarning() {
  playTone(660, 0.25, 0.35);
}

export function beepDouble() {
  playTone(880, 0.3, 0.7);
  playTone(880, 0.3, 0.7, 0.45);
}

export function beepTriple() {
  playTone(880, 0.25, 0.7);
  playTone(1100, 0.25, 0.7, 0.4);
  playTone(1320, 0.4, 0.8, 0.8);
}

export function beepComplete() {
  playTone(528, 1.5, 0.5);
  playTone(660, 1.5, 0.4, 0.3);
}

export function beepTransitionTick() {
  playTone(440, 0.08, 0.25, 0, 'square');
}

export function beepMetronomeTick(volume = 0.4) {
  playTone(1200, 0.04, volume, 0, 'square');
}

// Must be awaited inside a user-gesture handler so Safari's resume() resolves
// before any audio is scheduled.
export async function unlockAudio(): Promise<void> {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state !== 'running') {
    await ctx.resume();
  }
}
