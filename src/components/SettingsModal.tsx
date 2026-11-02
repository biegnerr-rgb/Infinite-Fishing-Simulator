import React, { useState } from 'react';
import { GameSettings } from '../types/game';
import { X, Volume2, VolumeX, Save, Download, Upload, AlertOctagon, Check } from 'lucide-react';
import { sound } from '../utils/audio';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onManualSave: () => void;
  onExportSave: () => string;
  onImportSave: (code: string) => boolean;
  onHardReset: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onManualSave,
  onExportSave,
  onImportSave,
  onHardReset,
  onClose,
}) => {
  const [saveCopied, setSaveCopied] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importError, setImportError] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleCopySave = () => {
    const code = onExportSave();
    navigator.clipboard.writeText(code).then(() => {
      setSaveCopied(true);
      setTimeout(() => setSaveCopied(false), 2500);
    });
  };

  const handleManualSave = () => {
    onManualSave();
    setSaveNotice(true);
    sound.playUpgrade();
    setTimeout(() => setSaveNotice(false), 2000);
  };

  const handleDoImport = () => {
    if (!importCode.trim()) return;
    const ok = onImportSave(importCode.trim());
    if (ok) {
      sound.playChest();
      onClose();
    } else {
      setImportError(true);
      setTimeout(() => setImportError(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-md">
              ⚙️
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Game Settings & Data</span>
              </h2>
              <p className="text-xs text-slate-400">
                Audio preferences, automatic sales rules, and cloud save codes.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          
          {/* Audio Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Audio & Sounds
            </h4>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <span className="text-sm font-semibold text-slate-200">Sound Effects</span>
              <button
                onClick={() => {
                  onUpdateSettings({ soundEnabled: !settings.soundEnabled });
                  sound.setMuted(settings.soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                <span>{settings.soundEnabled ? 'Enabled' : 'Muted'}</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Master Volume</span>
                <span className="font-mono">{Math.round(settings.soundVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.soundVolume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  onUpdateSettings({ soundVolume: vol });
                  sound.setVolume(vol);
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Gameplay & Auto-Sell Automation */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Automation & Preferences
            </h4>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Fast Manual Catch</span>
                <span className="text-[11px] text-slate-400">Skip catch popup for continuous rapid fishing</span>
              </div>
              <input
                type="checkbox"
                checked={settings.fastCatchMode}
                onChange={(e) => onUpdateSettings({ fastCatchMode: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Auto-Sell Common Catches</span>
                <span className="text-[11px] text-slate-400">Automatically trade newly caught Common fish for coins</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSellCommons}
                onChange={(e) => onUpdateSettings({ autoSellCommons: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <div>
                <span className="text-sm font-semibold text-slate-200 block">Auto-Sell Uncommon Catches</span>
                <span className="text-[11px] text-slate-400">Keep inventory free by auto-selling uncommons</span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoSellUncommons}
                onChange={(e) => onUpdateSettings({ autoSellUncommons: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Backup, Export & Reset */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">
              Save File Management
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleManualSave}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-slate-200"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>{saveNotice ? 'Saved!' : 'Save Progress'}</span>
              </button>

              <button
                onClick={handleCopySave}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer text-slate-200"
              >
                {saveCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5 text-sky-400" />}
                <span>{saveCopied ? 'Code Copied!' : 'Export Save'}</span>
              </button>
            </div>

            {/* Import Code Input */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Restore from Save Code:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste exported save string..."
                  value={importCode}
                  onChange={(e) => setImportCode(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleDoImport}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs cursor-pointer flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>
              {importError && (
                <span className="text-[11px] text-rose-400 block font-semibold">
                  Invalid save code string.
                </span>
              )}
            </div>

            {/* Hard Reset */}
            <div className="pt-2">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/50 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>Reset All Data (New Game)</span>
              </button>
            </div>
          </div>

        </div>

        {/* Reset Confirmation Overlay */}
        {showResetConfirm && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-30 flex items-center justify-center p-4">
            <div className="relative w-full max-w-sm rounded-3xl p-5 bg-slate-900 border-2 border-rose-600 shadow-2xl text-center">
              <AlertOctagon className="w-12 h-12 text-rose-500 mx-auto mb-2" />
              <h3 className="text-lg font-black text-white mb-1">
                Erase All Progress?
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                This will wipe all coins, unlocked fish, achievements, and upgrades permanently. This cannot be undone!
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowResetConfirm(false);
                    onHardReset();
                    onClose();
                  }}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs cursor-pointer shadow-lg"
                >
                  Yes, Erase Everything
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
