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

  // Restart metronome whenever BPM or flutter sound changes or demo starts/stops.
  useEffect(() => {
    if (!isDemoPlaying) return;
    const intervalMs = Math.round((60 / local.bpm) * 1000);
    playFlutterTick(local.flutterSound);
    const id = setInterval(() => playFlutterTick(local.flutterSound), intervalMs);
    return () => clearInterval(id);
  }, [isDemoPlaying, local.bpm, local.flutterSound]);

  const toggleDemo = async () => {
    if (!isDemoPlaying) {
      await unlockAudio();
    }
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
              <OptionRow
                label="Settle In"
                value={local.settleIn}
                options={[
                  { label: '10s', value: 10 },
                  { label: '15s', value: 15 },
                  { label: '20s', value: 20 },
                ]}
                onChange={v => set('settleIn', v)}
              />
              <OptionRow
                label="Butterfly"
                value={local.butterfly}
                options={[
                  { label: '1 min', value: 60 },
                  { label: '2 min', value: 120 },
                  { label: '3 min', value: 180 },
                ]}
                onChange={v => set('butterfly', v)}
              />
              <OptionRow
                label="Rock Baby (each leg)"
                value={local.rockBabyRight}
                options={[
                  { label: '1 min', value: 60 },
                  { label: '2 min', value: 120 },
                  { label: '3 min', value: 180 },
                ]}
                onChange={v => { set('rockBabyRight', v); set('rockBabyLeft', v); }}
              />
              <OptionRow
                label="Cat Stretch"
                value={local.catStretch}
                options={[
                  { label: '5 min', value: 300 },
                  { label: '6 min', value: 360 },
                  { label: '7 min', value: 420 },
                ]}
                onChange={v => set('catStretch', v)}
              />
              <OptionRow
                label="Breathing Exercise"
                value={local.breathing}
                options={[
                  { label: '6 min', value: 360 },
                  { label: '7 min', value: 420 },
                  { label: '8 min', value: 480 },
                ]}
                onChange={v => set('breathing', v)}
              />
              <OptionRow
                label="Nose Fluttering"
                value={local.noseFlutter}
                options={[
                  { label: '2 min', value: 120 },
                  { label: '2.5 min', value: 150 },
                  { label: '3 min', value: 180 },
                ]}
                onChange={v => set('noseFlutter', v)}
              />
              <OptionRow
                label="Breath Lock"
                value={local.breathLock}
                options={[
                  { label: '45s', value: 45 },
                  { label: '60s', value: 60 },
                  { label: '90s', value: 90 },
                ]}
                onChange={v => set('breathLock', v)}
              />
              <OptionRow
                label="Total Kriya Duration"
                value={local.totalKriyaMin}
                options={[
                  { label: '21 min', value: 21 },
                  { label: '25 min', value: 25 },
                  { label: '30 min', value: 30 },
                ]}
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

function OptionRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: { label: string; value: number }[];
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <div className="flex gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-purple-700 text-white border border-purple-500'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
