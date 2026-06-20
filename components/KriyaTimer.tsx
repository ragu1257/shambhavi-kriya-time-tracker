'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { buildPhases, formatTime, Settings } from '@/lib/phases';
import {
  beepWarning,
  beepDouble,
  beepTriple,
  beepComplete,
  beepTransitionTick,
  beepMetronomeTick,
  unlockAudio,
} from '@/lib/audio';
import { loadSettings, saveSettings, applyDailyBpmIncrement } from '@/lib/storage';
import SettingsPanel from './SettingsPanel';

type Status = 'idle' | 'running' | 'complete';

export default function KriyaTimer() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metronomeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warnedRef = useRef(false);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let s = loadSettings();
    s = applyDailyBpmIncrement(s);
    setSettings(s);
    setWakeLockSupported('wakeLock' in navigator);
  }, []);

  const phases = settings ? buildPhases(settings) : [];
  const currentPhase = phases[phaseIndex];
  const timeRemaining = currentPhase ? currentPhase.duration - elapsed : 0;

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      setWakeLockActive(true);
      wakeLockRef.current.addEventListener('release', () => setWakeLockActive(false));
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (status === 'running') requestWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [status, requestWakeLock]);

  const startSilentAudio = useCallback(() => {
    if (silentAudioRef.current) return;
    const audio = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA='
    );
    audio.loop = true;
    audio.volume = 0.001;
    audio.play().catch(() => {});
    silentAudioRef.current = audio;
  }, []);

  const stopSilentAudio = useCallback(() => {
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
      silentAudioRef.current = null;
    }
  }, []);

  const stopMetronome = useCallback(() => {
    if (metronomeRef.current) {
      clearInterval(metronomeRef.current);
      metronomeRef.current = null;
    }
  }, []);

  const startMetronome = useCallback((bpm: number) => {
    stopMetronome();
    const intervalMs = Math.round((60 / bpm) * 1000);
    metronomeRef.current = setInterval(() => beepMetronomeTick(), intervalMs);
  }, [stopMetronome]);

  const advancePhase = useCallback((nextIndex: number, currentPhases: ReturnType<typeof buildPhases>) => {
    if (nextIndex >= currentPhases.length) {
      setStatus('complete');
      stopMetronome();
      beepComplete();
      releaseWakeLock();
      stopSilentAudio();
      return;
    }

    const next = currentPhases[nextIndex];
    setPhaseIndex(nextIndex);
    setElapsed(0);
    warnedRef.current = false;

    if (next.hasMetronome && settings) {
      startMetronome(settings.bpm);
    } else {
      stopMetronome();
    }
  }, [settings, startMetronome, stopMetronome, releaseWakeLock, stopSilentAudio]);

  useEffect(() => {
    if (status !== 'running' || !settings) return;

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        const phase = buildPhases(settings)[phaseIndex];
        if (!phase) return prev;

        const remaining = phase.duration - next;

        if (remaining === 10 && !warnedRef.current) {
          warnedRef.current = true;
          if (!phase.isTransition) beepWarning();
        }

        if (phase.isTransition && remaining > 0 && remaining <= 5) {
          beepTransitionTick();
        }

        if (next >= phase.duration) {
          const phases = buildPhases(settings);
          const nextIndex = phaseIndex + 1;

          if (!phase.noEndBeep) {
            if (phase.id === 'cat_stretch') {
              beepTriple();
            } else if (!phase.isTransition) {
              beepDouble();
            }
          }

          setTimeout(() => {
            advancePhase(nextIndex, phases);
          }, 0);

          return next;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, phaseIndex, settings, advancePhase]);

  const handleStart = async () => {
    if (!settings) return;
    unlockAudio();
    await requestWakeLock();
    startSilentAudio();
    setStatus('running');
    setPhaseIndex(0);
    setElapsed(0);
    warnedRef.current = false;
  };

  const handleReset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopMetronome();
    releaseWakeLock();
    stopSilentAudio();
    setStatus('idle');
    setPhaseIndex(0);
    setElapsed(0);
    warnedRef.current = false;
  };

  const handleSettingsSave = (newSettings: Settings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
    setShowSettings(false);
  };

  const adjustBpm = (delta: number) => {
    if (!settings) return;
    const updated = { ...settings, bpm: Math.max(40, Math.min(200, settings.bpm + delta)) };
    saveSettings(updated);
    setSettings(updated);
    if (status === 'running' && currentPhase?.hasMetronome) {
      startMetronome(updated.bpm);
    }
  };

  if (!settings) return null;

  const progress = currentPhase ? elapsed / currentPhase.duration : 0;
  const warmupPhases = phases.filter(p => !p.isTransition && p.type === 'warmup');
  const kriyaPhases = phases.filter(p => !p.isTransition && p.type === 'kriya');

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h1 className="text-lg font-bold tracking-wide text-purple-300">Shambhavi Kriya</h1>
          {!wakeLockSupported && status === 'running' && (
            <p className="text-xs text-amber-400 mt-0.5">Keep screen on manually</p>
          )}
          {wakeLockActive && (
            <p className="text-xs text-emerald-500 mt-0.5">Screen stay-awake: on</p>
          )}
        </div>
        {status === 'idle' && (
          <button
            onClick={() => setShowSettings(true)}
            className="text-gray-400 hover:text-white p-2 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        )}
        {status === 'running' && (
          <button
            onClick={handleReset}
            className="text-gray-500 hover:text-red-400 text-sm px-3 py-1 rounded-lg border border-gray-700 hover:border-red-800 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        {status === 'idle' && (
          <IdleScreen
            settings={settings}
            warmupCount={warmupPhases.length}
            kriyaCount={kriyaPhases.length}
            onStart={handleStart}
          />
        )}

        {status === 'running' && currentPhase && (
          <RunningScreen
            phase={currentPhase}
            timeRemaining={timeRemaining}
            progress={progress}
            phaseIndex={phaseIndex}
            phases={phases}
            settings={settings}
            onAdjustBpm={adjustBpm}
          />
        )}

        {status === 'complete' && (
          <CompleteScreen onReset={handleReset} />
        )}
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function IdleScreen({
  settings,
  warmupCount,
  kriyaCount,
  onStart,
}: {
  settings: Settings;
  warmupCount: number;
  kriyaCount: number;
  onStart: () => void;
}) {
  const phases = buildPhases(settings);
  const visiblePhases = phases.filter(p => !p.isTransition);

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-gray-400 text-sm mb-1">Total session</p>
        <p className="text-2xl font-bold text-white">
          ~{Math.round((phases.reduce((a, p) => a + p.duration, 0)) / 60)} min
        </p>
        <p className="text-gray-500 text-xs mt-1">
          Warmup + {settings.totalKriyaMin} min Kriya
        </p>
      </div>

      <div className="w-full space-y-1.5">
        {visiblePhases.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-900">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
              p.type === 'warmup' ? 'bg-blue-900 text-blue-300' : 'bg-purple-900 text-purple-300'
            }`}>
              {i + 1}
            </span>
            <span className="text-sm text-gray-300 flex-1">{p.name}</span>
            <span className="text-xs text-gray-500 font-mono">{formatTime(p.duration)}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="w-full py-5 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 rounded-2xl text-xl font-bold tracking-wide transition-colors shadow-lg shadow-purple-900/40"
      >
        Begin Practice
      </button>

      <p className="text-xs text-gray-600 text-center">
        Audio cues will guide you throughout.
        <br />Keep your phone volume up.
      </p>
    </div>
  );
}

function RunningScreen({
  phase,
  timeRemaining,
  progress,
  phaseIndex,
  phases,
  settings,
  onAdjustBpm,
}: {
  phase: ReturnType<typeof buildPhases>[0];
  timeRemaining: number;
  progress: number;
  phaseIndex: number;
  phases: ReturnType<typeof buildPhases>;
  settings: Settings;
  onAdjustBpm: (delta: number) => void;
}) {
  const visiblePhases = phases.filter(p => !p.isTransition);
  const visibleIndex = visiblePhases.findIndex(p => p.id === phase.id);
  const isTransition = phase.isTransition;

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <div className={`px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase ${
        phase.type === 'warmup'
          ? 'bg-blue-900/60 text-blue-300 border border-blue-800'
          : phase.type === 'kriya'
          ? 'bg-purple-900/60 text-purple-300 border border-purple-800'
          : 'bg-gray-800 text-gray-400 border border-gray-700'
      }`}>
        {isTransition ? 'Transition' : phase.type === 'warmup' ? 'Warm-up' : 'Kriya'}
      </div>

      <h2 className={`text-center font-bold leading-tight ${
        isTransition ? 'text-2xl text-gray-300' : 'text-3xl text-white'
      }`}>
        {phase.name}
      </h2>

      {!isTransition ? (
        <div className="relative flex items-center justify-center">
          <svg className="w-52 h-52 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="#1f2937" strokeWidth="4" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke={phase.type === 'kriya' ? '#7c3aed' : '#1d4ed8'}
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute text-center">
            <p className="text-5xl font-mono font-bold">{formatTime(timeRemaining)}</p>
            <p className="text-gray-500 text-xs mt-1">remaining</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-40 h-40 rounded-full bg-gray-900 border-2 border-gray-700">
          <div className="text-center">
            <p className="text-6xl font-mono font-bold text-amber-400">{timeRemaining}</p>
            <p className="text-gray-500 text-xs mt-1">seconds</p>
          </div>
        </div>
      )}

      <p className="text-gray-400 text-sm text-center leading-relaxed">
        {phase.instruction}
      </p>

      {phase.hasMetronome && (
        <div className="w-full bg-gray-900 rounded-2xl p-4 border border-gray-800">
          <p className="text-center text-xs text-gray-500 uppercase tracking-widest mb-3">
            Metronome
          </p>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => onAdjustBpm(-5)}
              className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-xl font-bold transition-colors"
            >
              −
            </button>
            <div className="text-center">
              <p className="text-3xl font-mono font-bold text-purple-300">{settings.bpm}</p>
              <p className="text-xs text-gray-500">BPM</p>
            </div>
            <button
              onClick={() => onAdjustBpm(5)}
              className="w-12 h-12 rounded-full bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-xl font-bold transition-colors"
            >
              +
            </button>
          </div>
          <div className="flex justify-center gap-2 mt-3">
            {[-1, +1].map(d => (
              <button
                key={d}
                onClick={() => onAdjustBpm(d)}
                className="text-xs text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded border border-gray-800 hover:border-gray-600 transition-colors"
              >
                {d > 0 ? `+${d}` : d}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isTransition && visiblePhases.length > 0 && (
        <div className="flex gap-2 flex-wrap justify-center">
          {visiblePhases.map((p, i) => (
            <div
              key={p.id}
              className={`rounded-full transition-all ${
                i < visibleIndex
                  ? 'w-2 h-2 bg-gray-600'
                  : i === visibleIndex
                  ? 'w-3 h-3 bg-purple-400 shadow-sm shadow-purple-400'
                  : 'w-2 h-2 bg-gray-800'
              }`}
            />
          ))}
        </div>
      )}

      {!isTransition && (() => {
        const nextPhase = phases.slice(phaseIndex + 1).find(p => !p.isTransition);
        if (!nextPhase) return null;
        return (
          <p className="text-xs text-gray-600">
            Next: {nextPhase.name} · {formatTime(nextPhase.duration)}
          </p>
        );
      })()}
    </div>
  );
}

function CompleteScreen({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-24 h-24 rounded-full bg-purple-900/40 border-2 border-purple-600 flex items-center justify-center">
        <span className="text-4xl">✓</span>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Practice Complete</h2>
        <p className="text-gray-400 text-sm">
          Shambhavi Kriya done.<br />Rest in stillness.
        </p>
      </div>
      <button
        onClick={onReset}
        className="mt-4 px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm text-gray-300 transition-colors"
      >
        Start Again
      </button>
    </div>
  );
}
