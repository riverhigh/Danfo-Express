import React from 'react';
import { MissionGoal } from '../types/game';
import { MISSIONS_CATALOG } from '../game/config';
import { Trophy, Clock, Route, Award, ArrowRight, ShieldCheck, Fuel } from 'lucide-react';

interface MissionSelectorProps {
  selectedMissionId: string;
  onSelectMission: (mission: MissionGoal) => void;
  onStartMission: (mission: MissionGoal) => void;
}

export const MissionSelector: React.FC<MissionSelectorProps> = ({
  selectedMissionId,
  onSelectMission,
  onStartMission,
}) => {
  const selectedMission = MISSIONS_CATALOG.find((m) => m.id === selectedMissionId) || MISSIONS_CATALOG[0];

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-amber-400 uppercase tracking-wide flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Dr. Driving Lagos Missions
          </h2>
          <p className="text-xs text-stone-400">
            Select a specialized driving challenge with strict real-world simulator conditions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {MISSIONS_CATALOG.map((mission) => {
          const isSelected = mission.id === selectedMission.id;
          return (
            <button
              key={mission.id}
              onClick={() => onSelectMission(mission)}
              className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-amber-400/15 border-amber-400 ring-1 ring-amber-400 shadow-lg shadow-amber-400/10 text-white'
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm text-amber-400">{mission.title}</span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">₦{mission.rewardNaira.toLocaleString()}</span>
                </div>
                <div className="text-[11px] font-medium text-stone-400 mb-2">{mission.location}</div>
                <p className="text-xs text-stone-300 mb-3 line-clamp-2">{mission.description}</p>
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between text-[11px] font-mono text-stone-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" /> {mission.timeLimitSec}s
                </span>
                <span className="flex items-center gap-1">
                  <Route className="w-3 h-3 text-sky-400" /> {mission.targetDistanceMeters}m
                </span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <Award className="w-3 h-3" /> Badge
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Mission Briefing Banner */}
      <div className="p-5 bg-stone-900 border-2 border-amber-400/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest">
            ACTIVE MISSION BRIEFING
          </div>
          <div className="text-lg font-black text-white">{selectedMission.title} ({selectedMission.location})</div>
          <div className="text-xs text-stone-300 mt-1 max-w-xl">{selectedMission.description}</div>
        </div>

        <button
          onClick={() => onStartMission(selectedMission)}
          className="w-full sm:w-auto px-8 py-3 bg-amber-400 hover:bg-amber-300 active:scale-95 text-stone-950 font-black font-['Bungee'] rounded-xl text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 shrink-0"
        >
          <span>LAUNCH 3D SIMULATOR</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
