export type TransitionSoundType = 'softChime' | 'singingBowl' | 'singleBeep' | 'bell';
export type FlutterSoundType = 'softTick' | 'woodblock' | 'lowClick' | 'highPing';

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

export function playTransitionSound(type: TransitionSoundType): void {
  switch (type) {
    case 'softChime':
      playTone(523, 2.0, 0.38, 0, 'sine');
      playTone(1047, 1.4, 0.14, 0.05, 'sine');
      break;
    case 'singingBowl':
      playTone(220, 3.5, 0.32, 0, 'sine');
      playTone(440, 3.0, 0.14, 0, 'sine');
      playTone(660, 2.5, 0.07, 0, 'sine');
      break;
    case 'singleBeep':
      playTone(880, 0.3, 0.5, 0, 'sine');
      break;
    case 'bell':
      playTone(440, 2.5, 0.38, 0, 'sine');
      playTone(880, 1.8, 0.18, 0, 'sine');
      playTone(1320, 1.2, 0.09, 0, 'sine');
      playTone(2200, 0.6, 0.04, 0, 'sine');
      break;
  }
}

export function playFlutterTick(type: FlutterSoundType, volume = 0.4): void {
  switch (type) {
    case 'softTick':
      playTone(400, 0.05, volume, 0, 'sine');
      break;
    case 'woodblock':
      playTone(180, 0.04, volume * 1.2, 0, 'triangle');
      playTone(230, 0.02, volume * 0.6, 0, 'sine');
      break;
    case 'lowClick':
      playTone(200, 0.03, volume * 1.3, 0, 'sine');
      break;
    case 'highPing':
      playTone(2000, 0.04, volume * 0.7, 0, 'sine');
      break;
  }
}

export function beepComplete() {
  playTone(528, 1.5, 0.5);
  playTone(660, 1.5, 0.4, 0.3);
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
