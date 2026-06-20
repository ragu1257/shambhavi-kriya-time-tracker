import type { TransitionSoundType, FlutterSoundType } from './audio';

export type { TransitionSoundType, FlutterSoundType };
export type PhaseType = 'warmup' | 'transition' | 'kriya';

export interface Phase {
  id: string;
  name: string;
  instruction: string;
  duration: number;
  type: PhaseType;
  configKey?: keyof Settings;
  hasMetronome?: boolean;
  noEndBeep?: boolean;
  isTransition?: boolean;
}

export interface Settings {
  transitionSound: TransitionSoundType;
  flutterSound: FlutterSoundType;
  bpm: number;
  bpmLastUpdated: string;
  settleIn: number;
  butterfly: number;
  rockBabyRight: number;
  rockBabyLeft: number;
  catStretch: number;
  breathing: number;
  noseFlutter: number;
  breathLock: number;
  totalKriyaMin: number;
}

export const DEFAULT_SETTINGS: Settings = {
  transitionSound: 'softChime',
  flutterSound: 'softTick',
  bpm: 85,
  bpmLastUpdated: '',
  settleIn: 15,
  butterfly: 120,
  rockBabyRight: 120,
  rockBabyLeft: 120,
  catStretch: 360,
  breathing: 360,
  noseFlutter: 150,
  breathLock: 60,
  totalKriyaMin: 21,
};

export function buildPhases(settings: Settings): Phase[] {
  const {
    settleIn, butterfly, rockBabyRight, rockBabyLeft,
    catStretch, breathing, noseFlutter, breathLock, totalKriyaMin,
  } = settings;
  const totalKriyaSeconds = totalKriyaMin * 60;
  const aumDuration = Math.max(totalKriyaSeconds - breathing - noseFlutter - breathLock, 60);

  return [
    {
      id: 'settle_in',
      name: 'Settle In',
      instruction: 'Close your eyes and breathe naturally',
      duration: settleIn,
      type: 'warmup',
    },
    {
      id: 'butterfly',
      name: 'Butterfly',
      instruction: 'Sit with feet together, gently flap knees',
      duration: butterfly,
      type: 'warmup',
    },
    {
      id: 'transition_1',
      name: 'Switch → Rock Baby',
      instruction: 'Cradle your right leg',
      duration: 5,
      type: 'transition',
      isTransition: true,
    },
    {
      id: 'rock_right',
      name: 'Rock Baby · Right Leg',
      instruction: 'Cradle right leg, rock side to side',
      duration: rockBabyRight,
      type: 'warmup',
    },
    {
      id: 'transition_2',
      name: 'Switch Leg',
      instruction: 'Switch to your left leg',
      duration: 5,
      type: 'transition',
      isTransition: true,
    },
    {
      id: 'rock_left',
      name: 'Rock Baby · Left Leg',
      instruction: 'Cradle left leg, rock side to side',
      duration: rockBabyLeft,
      type: 'warmup',
    },
    {
      id: 'transition_3',
      name: 'Move to Cat Stretch',
      instruction: 'Get into position on all fours',
      duration: 5,
      type: 'transition',
      isTransition: true,
    },
    {
      id: 'cat_stretch',
      name: 'Cat Stretch',
      instruction: 'Alternate arching and rounding your spine slowly',
      duration: catStretch,
      type: 'warmup',
      configKey: 'catStretch',
    },
    {
      id: 'pre_kriya',
      name: 'Prepare for Kriya',
      instruction: 'Sit up, close your eyes, settle in',
      duration: 20,
      type: 'transition',
      isTransition: true,
    },
    {
      id: 'breathing',
      name: 'Breathing Exercise',
      instruction: 'Slow, deep, rhythmic breathing',
      duration: breathing,
      type: 'kriya',
      configKey: 'breathing',
    },
    {
      id: 'aum',
      name: 'Aum Chanting',
      instruction: 'Chant Aum 21 times with full feeling',
      duration: aumDuration,
      type: 'kriya',
    },
    {
      id: 'nose_flutter',
      name: 'Nose Fluttering',
      instruction: 'Rapid nasal breathing, follow the beat',
      duration: noseFlutter,
      type: 'kriya',
      configKey: 'noseFlutter',
      hasMetronome: true,
    },
    {
      id: 'breath_lock',
      name: 'Breath Lock',
      instruction: 'Lock breath inward, hold with full awareness',
      duration: breathLock,
      type: 'kriya',
      noEndBeep: true,
    },
  ];
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function totalWarmupSeconds(): number {
  return 120 + 5 + 120 + 5 + 120 + 5;
}
