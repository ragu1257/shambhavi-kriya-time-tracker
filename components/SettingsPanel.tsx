'use client';

import { useState, useEffect } from 'react';
import { Settings, TransitionSoundType, FlutterSoundType } from '@/lib/phases';
import { playFlutterTick, playTransitionSound, unlockAudio } from '@/lib/audio';

interface Props {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
}

const TRANSITION_SOUND_LABELS: Record<TransitionSoundType, string> = {
  softChime: 'Soft Chime',
  singingBowl: 'Singing Bowl',
  singleBeep: 'Single Beep',
  bell: 'Bell',
};

const FLUTTER_SOUND_LABELS: Record<FlutterSoundType, string> = {
  softTick: 'Soft Tick',
  woodblock: 'Woodblock',
  lowClick: 'Low Click',
  highPing: 'High Ping',
};

export default function SettingsPanel({ settings, onSave, onClose }: Props) {
  const [local, setLocal] = useState<Settings>({ ...settings });
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setLocal(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!isDemoPlaying) return;
    const intervalMs = Math.round((60 / local.bpm) * 1000);
    playFlutterTick(local.flutterSound);
    const id = setInterval(() => playFlutterTick(local.flutterSound), intervalMs);
    return () => clearInterval(id);
  }, [isDemoPlaying, local.bpm, local.flutterSound]);

  const toggleDemo = async () => {
    if (!isDemoPlaying) await unlockAudio();
    setIsDemoPlaying(prev => !prev);
  };

  const previewTransition = async () => {
    await unlockAudio();
    playTransitionSound(local.transitionSound);
  };

  const handleSave = () => {
    setIsDemoPlaying(false);
    onSave(local);
  };

  const handleClose = () => {
    setIsDemoPlaying(false);
    onClose();
  };

  const aumDuration = Math.max(
    local.totalKriyaMin * 60 - local.breathing - local.noseFlutter - local.breathLock,
    60
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-800 p-5 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Settings</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-5 pr-1">

          {/* Sounds */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Sounds</p>
            <div className="space-y-4">
              <SoundDropdown
                label="Transition Sound"
                value={local.transitionSound}
                options={TRANSITION_SOUND_LABELS}
                onChange={v => set('transitionSound', v as TransitionSoundType)}
                onPreview={previewTransition}
              />
              <SoundDropdown
                label="Flutter Metronome"
                value={local.flutterSound}
                options={FLUTTER_SOUND_LABELS}
                onChange={v => set('flutterSound', v as FlutterSoundType)}
              />
            </div>
          </div>

          <div className="border-t border-gray-800" />

          {/* Timings */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Timings</p>
            <div className="space-y-4">
              <TimeInput
                label="Settle In"
                value={local.settleIn}
                unit="sec"
                min={5}
                max={60}
                step={5}
                onChange={v => set('settleIn', v)}
              />
              <TimeInput
                label="Butterfly"
                value={local.butterfly / 60}
                unit="min"
                min={1}
                max={5}
                step={0.5}
                onChange={v => set('butterfly', Math.round(v * 60))}
              />
              <TimeInput
                label="Rock Baby (each leg)"
                value={local.rockBabyRight / 60}
                unit="min"
                min={1}
                max={5}
                step={0.5}
                onChange={v => {
                  const s = Math.round(v * 60);
                  set('rockBabyRight', s);
                  set('rockBabyLeft', s);
                }}
              />
              <TimeInput
                label="Cat Stretch"
                value={local.catStretch / 60}
                unit="min"
                min={3}
                max={10}
                step={0.5}
                onChange={v => set('catStretch', Math.round(v * 60))}
              />
              <TimeInput
                label="Breathing Exercise"
                value={local.breathing / 60}
                unit="min"
                min={4}
                max={15}
                step={0.5}
                onChange={v => set('breathing', Math.round(v * 60))}
              />
              <TimeInput
                label="Nose Fluttering"
                value={local.noseFlutter / 60}
                unit="min"
                min={1}
                max={5}
                step={0.5}
                onChange={v => set('noseFlutter', Math.round(v * 60))}
              />
              <TimeInput
                label="Breath Lock"
                value={local.breathLock}
                unit="sec"
                min={20}
                max={120}
                step={5}
                onChange={v => set('breathLock', v)}
              />
              <TimeInput
                label="Total Kriya Duration"
                value={local.totalKriyaMin}
                unit="min"
                min={15}
                max={45}
                step={1}
                onChange={v => set('totalKriyaMin', v)}
              />
            </div>
          </div>

          <div className="border-t border-gray-800" />

          {/* BPM */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Metronome</p>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Nose Flutter BPM</label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-purple-300">{local.bpm} BPM</span>
                <button
                  onClick={toggleDemo}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors border ${
                    isDemoPlaying
                      ? 'bg-purple-700 border-purple-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                  }`}
                >
                  {isDemoPlaying ? (
                    <><span className="w-2 h-2 rounded-sm bg-white inline-block" />Stop</>
                  ) : (
                    <><span className="w-0 h-0 border-y-4 border-y-transparent border-l-[7px] border-l-current inline-block" />Test</>
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => set('bpm', Math.max(40, local.bpm - 5))}
                className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold transition-colors"
              >−</button>
              <input
                type="range" min={40} max={200} value={local.bpm}
                onChange={e => set('bpm', Number(e.target.value))}
                className="flex-1 accent-purple-500"
              />
              <button
                onClick={() => set('bpm', Math.min(200, local.bpm + 5))}
                className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold transition-colors"
              >+</button>
            </div>
            {isDemoPlaying
              ? <p className="text-xs text-purple-400 mt-1 animate-pulse">Playing at {local.bpm} BPM…</p>
              : <p className="text-xs text-gray-600 mt-1">Auto +1 BPM each new day</p>
            }
          </div>

          <div className="rounded-lg bg-gray-800/60 border border-gray-700 px-3 py-2">
            <p className="text-xs text-gray-500">
              Aum chanting will be{' '}
              <span className="text-purple-300 font-mono">
                {Math.floor(aumDuration / 60)}:{String(aumDuration % 60).padStart(2, '0')}
              </span>{' '}
              to hit {local.totalKriyaMin} min Kriya total.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-5 w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SoundDropdown({
  label,
  value,
  options,
  onChange,
  onPreview,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (v: string) => void;
  onPreview?: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-sm text-gray-400">{label}</p>
        {onPreview && (
          <button
            onClick={onPreview}
            className="text-xs text-gray-500 hover:text-purple-300 px-2 py-0.5 rounded border border-gray-800 hover:border-gray-600 transition-colors"
          >
            Preview
          </button>
        )}
      </div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
      >
        {Object.entries(options).map(([val, lbl]) => (
          <option key={val} value={val}>{lbl}</option>
        ))}
      </select>
    </div>
  );
}

// Uses type="text" (not type="number") so that typing a decimal point does
// not clear the field — browsers return e.target.value="" for partial numbers
// like "2." on type="number" inputs. inputMode gives the right mobile keyboard.
function TimeInput({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: 'min' | 'sec';
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= min && v <= max) {
      onChange(v);
    } else {
      setRaw(String(value));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-sm text-gray-400">{label}</p>
        <span className="text-xs text-gray-600">{unit}</span>
      </div>
      <input
        type="text"
        inputMode={Number.isInteger(step) ? 'numeric' : 'decimal'}
        value={raw}
        onChange={e => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-purple-500"
      />
    </div>
  );
}
