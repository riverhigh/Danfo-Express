import React, { useState } from 'react';
import { User, Sparkles } from 'lucide-react';

interface CharacterCreationProps {
  onComplete: (name: string, gender: 'MALE' | 'FEMALE') => void;
}

export const CharacterCreation: React.FC<CharacterCreationProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');

  return (
    <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-stone-900 border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl">
        <h1 className="text-3xl font-black font-['Bungee'] text-amber-400 mb-2 text-center">
          Lagos Driver Profile
        </h1>
        <p className="text-stone-400 text-sm text-center mb-6">
          Every legend has a beginning. What is your name, driver?
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">Driver Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bamidele"
              maxLength={15}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">Gender</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setGender('MALE')}
                className={`py-3 rounded-xl border-2 font-bold transition-all \${gender === 'MALE' ? 'bg-amber-400 text-stone-950 border-amber-400' : 'bg-stone-950 text-stone-400 border-stone-800'}`}
              >
                MALE
              </button>
              <button
                onClick={() => setGender('FEMALE')}
                className={`py-3 rounded-xl border-2 font-bold transition-all \${gender === 'FEMALE' ? 'bg-amber-400 text-stone-950 border-amber-400' : 'bg-stone-950 text-stone-400 border-stone-800'}`}
              >
                FEMALE
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              if (name.trim().length < 2) return;
              onComplete(name.trim(), gender);
            }}
            disabled={name.trim().length < 2}
            className="w-full py-4 mt-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-black text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all font-['Bungee']"
          >
            <Sparkles className="w-5 h-5" />
            ENTER THE HUSTLE
          </button>
        </div>
      </div>
    </div>
  );
};
