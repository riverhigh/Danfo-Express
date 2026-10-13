import React, { useState } from 'react';
import { X, Shield, AlertTriangle, CheckCircle2, Car, Truck, DollarSign, FileText, BadgeAlert } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface PoliceLastmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletNaira: number;
  impoundFineDue: number;
  impoundReason: string;
  hasRoadClearancePass: boolean;
  onPayImpoundFine: (amount: number) => void;
  onBuyRoadClearancePass: () => void;
  onTriggerTestTow: () => void;
  addFeedMessage: (msg: string) => void;
}

export const PoliceLastmaModal: React.FC<PoliceLastmaModalProps> = ({
  isOpen,
  onClose,
  walletNaira,
  impoundFineDue,
  impoundReason,
  hasRoadClearancePass,
  onPayImpoundFine,
  onBuyRoadClearancePass,
  onTriggerTestTow,
  addFeedMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'DESK' | 'IMPOUND' | 'CLEARANCE'>('DESK');
  const [officerDialogue, setOfficerDialogue] = useState<string>(
    'Marshal Balogun: "Oga driver! Park your Danfo properly. If you block the road outside the extended bus stops, our heavy tow truck will bring you here!"'
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-stone-950 border-2 border-stone-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header: Police Navy (Left) & LASTMA Wine (Right) */}
        <div className="bg-gradient-to-r from-blue-950 via-stone-900 to-rose-950 p-4 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-700 via-stone-900 to-rose-800 border-2 border-amber-400/80 flex items-center justify-center text-2xl shadow-lg shrink-0">
              🚔
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Bungee'] text-sm text-white tracking-wide">
                  ZONE 2 JOINT ENFORCEMENT COMMAND
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-300">
                <span className="text-sky-400 font-bold">NPF HIGHWAY PATROL</span>
                <span>•</span>
                <span className="text-rose-400 font-bold">LASTMA TRAFFIC OFFICE</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900/80 border border-stone-700 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Officer Uniform Visual Badges */}
        <div className="bg-stone-900/90 px-4 py-2 border-b border-stone-800 flex items-center justify-between text-[10.5px]">
          <div className="flex items-center gap-2">
            {/* LASTMA Officer badge (Cream & Wine) */}
            <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-500/50 rounded-lg px-2 py-1">
              <span className="w-3 h-3 rounded-full bg-[#fef08a] border border-[#881337] flex items-center justify-center text-[7px] font-black text-[#881337]">
                L
              </span>
              <span className="text-rose-200 font-bold">Marshal Balogun (Cream & Wine Lines)</span>
            </div>

            {/* Police Officer badge */}
            <div className="flex items-center gap-1.5 bg-blue-950/70 border border-blue-500/50 rounded-lg px-2 py-1">
              <span className="w-3 h-3 rounded-full bg-blue-600 border border-blue-300 text-[7px] text-white font-bold flex items-center justify-center">
                P
              </span>
              <span className="text-sky-200 font-bold">Officer Adebayo (NPF Patrol)</span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-emerald-400 font-bold">
            💰 ₦{walletNaira.toLocaleString()}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 bg-stone-950 border-b border-stone-800 text-[11px] font-['Bungee'] shrink-0">
          <button
            onClick={() => setActiveTab('DESK')}
            className={`py-2.5 transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'DESK'
                ? 'border-amber-400 text-amber-400 bg-stone-900/50'
                : 'border-transparent text-stone-400 hover:text-white'
            }`}
          >
            <span>👮 COUNTER</span>
          </button>
          <button
            onClick={() => setActiveTab('IMPOUND')}
            className={`py-2.5 transition-colors border-b-2 flex items-center justify-center gap-1.5 relative ${
              activeTab === 'IMPOUND'
                ? 'border-rose-500 text-rose-400 bg-stone-900/50'
                : 'border-transparent text-stone-400 hover:text-white'
            }`}
          >
            <span>🏗️ IMPOUND YARD</span>
            {impoundFineDue > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('CLEARANCE')}
            className={`py-2.5 transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
              activeTab === 'CLEARANCE'
                ? 'border-emerald-400 text-emerald-400 bg-stone-900/50'
                : 'border-transparent text-stone-400 hover:text-white'
            }`}
          >
            <span>🛡️ ROAD PASS</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Officer Dialogue Bubble */}
          <div className="bg-gradient-to-r from-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-3 shadow-inner flex items-start gap-3">
            <span className="text-2xl shrink-0">🗣️</span>
            <div className="flex-1">
              <div className="text-[9px] font-mono uppercase text-amber-400 font-black">STATION INTERCOM</div>
              <p className="text-xs text-stone-200 italic leading-snug mt-0.5 font-medium">
                "{officerDialogue}"
              </p>
            </div>
          </div>

          {/* TAB 1: COUNTER DESK */}
          {activeTab === 'DESK' && (
            <div className="space-y-3">
              <div className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-bold text-white">Daily Traffic Compliance Advisory</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                    24/7 PATROL
                  </span>
                </div>
                <p className="text-[10.5px] text-stone-300 leading-relaxed">
                  The Joint Nigeria Police Force & LASTMA Task Force enforces expressway order:
                  <br />• <strong>Bus Stop Rules:</strong> Always pull cleanly into the newly extended 22m bus stop curbs. Picking passengers in outer expressway lanes attracts instant towing.
                  <br />• <strong>Pedestrian Safety:</strong> Hitting pedestrians crossing near roundabouts triggers immediate impoundment to this yard!
                  <br />• <strong>One-Way Driving:</strong> Driving against traffic flow is strictly prohibited.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    soundEngine.playCoin();
                    setOfficerDialogue(
                      'Marshal Balogun: "Well done driver. Make sure your brake fluid is filled. Our LASTMA officers in wine stripes are watching every junction!"'
                    );
                    addFeedMessage('👮 Officer Adebayo inspected your Danfo vehicle registration: Verified OK!');
                  }}
                  className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 rounded-xl text-left transition-all active:scale-95 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Present Particulars</span>
                  </div>
                  <p className="text-[9.5px] text-stone-400">Show road worthiness and driver licence</p>
                </button>

                <button
                  onClick={() => {
                    soundEngine.playSiren();
                    setOfficerDialogue(
                      'Officer Adebayo: "Attention all patrol units! LASTMA Tow Truck Unit 04 dispatched on highway drill!"'
                    );
                    onTriggerTestTow();
                  }}
                  className="p-3 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/50 rounded-xl text-left transition-all active:scale-95 flex flex-col gap-1"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Test LASTMA Towing</span>
                  </div>
                  <p className="text-[9.5px] text-stone-400">Simulate vehicle impoundment & tow drill</p>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPOUND YARD & TOW DESK */}
          {activeTab === 'IMPOUND' && (
            <div className="space-y-3">
              {impoundFineDue > 0 ? (
                <div className="bg-rose-950/70 border-2 border-rose-500 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center text-xl shrink-0">
                      🚨
                    </div>
                    <div>
                      <div className="text-[10px] font-mono font-black text-rose-300 uppercase tracking-wide">
                        VEHICLE IMPOUNDED IN YARD BAY 4
                      </div>
                      <h4 className="text-sm font-bold text-white">
                        Reason: {impoundReason || 'Traffic Obstruction & Violation'}
                      </h4>
                    </div>
                  </div>

                  <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-300">Official Release Bail Fine:</span>
                    <span className="text-rose-400 font-black text-base">
                      ₦{impoundFineDue.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (walletNaira < impoundFineDue) {
                        addFeedMessage(`⚠️ Insufficient funds! You need ₦${impoundFineDue.toLocaleString()} to release your Danfo.`);
                        return;
                      }
                      onPayImpoundFine(impoundFineDue);
                      setOfficerDialogue(
                        'Marshal Balogun: "Fine settled! Your Danfo steering keys are released from Bay 4. Drive carefully and avoid repeat offenses!"'
                      );
                    }}
                    disabled={walletNaira < impoundFineDue}
                    className={`w-full py-3 rounded-xl font-['Bungee'] text-xs transition-all shadow-lg flex items-center justify-center gap-2 ${
                      walletNaira >= impoundFineDue
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-stone-950 active:scale-95'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <span>💳 PAY ₦{impoundFineDue.toLocaleString()} FINE & RELEASE VEHICLE</span>
                  </button>
                </div>
              ) : (
                <div className="bg-stone-900/80 border border-emerald-500/40 rounded-2xl p-4 flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
                    ✓
                  </div>
                  <h4 className="text-sm font-bold text-white">No Vehicles Currently Impounded</h4>
                  <p className="text-[11px] text-stone-300 max-w-sm">
                    Your Danfo bus is clean and free of pending impound citations. Keep obeying traffic rules and stopping only at designated extended bus shelters!
                  </p>
                </div>
              )}

              {/* Parked Fleet Info */}
              <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-3 space-y-2">
                <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wide">
                  Station Yard Inventory:
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-300 font-mono">
                  <div className="p-2 rounded-lg bg-stone-950 border border-stone-800">
                    🚔 2x Police Hilux Patrol Trucks
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950 border border-stone-800">
                    🏗️ 1x LASTMA Heavy Tow Crane
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950 border border-stone-800">
                    🚌 3x Impounded Rival Buses
                  </div>
                  <div className="p-2 rounded-lg bg-stone-950 border border-stone-800">
                    🚗 2x Civilian One-Way Sedans
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OFFICIAL ROAD CLEARANCE PASS */}
          {activeTab === 'CLEARANCE' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-emerald-950/60 via-stone-900 to-teal-950/60 border-2 border-emerald-400/80 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/25 border border-emerald-400 flex items-center justify-center text-2xl shrink-0">
                    🛡️
                  </div>
                  <div>
                    <span className="text-[9px] font-mono font-black text-emerald-300 uppercase tracking-wider">
                      OFFICIAL LAGOS STATE ENFORCEMENT CERTIFICATE
                    </span>
                    <h4 className="text-sm font-bold text-white">
                      LASTMA & Police Road Clearance Pass
                    </h4>
                  </div>
                </div>

                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Grants official government sticker and clearance immunity:
                  <br />• <strong>Towing Immunity:</strong> LASTMA tow trucks will not impound your vehicle during minor kerb delays.
                  <br />• <strong>Priority Corridor Clearance:</strong> Fast lane privilege past Zone 2 checkpoint.
                  <br />• <strong>Validity:</strong> 10,000 meters driving along Expressway.
                </p>

                <div className="bg-stone-950/80 p-3 rounded-xl border border-stone-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-stone-300">Clearance Fee:</span>
                  <span className="text-emerald-400 font-black text-base">₦5,000</span>
                </div>

                {hasRoadClearancePass ? (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-400 text-center text-emerald-300 text-xs font-['Bungee'] flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>OFFICIAL PASS ACTIVE ON DANFO WINDSHIELD (✓ VALID)</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (walletNaira < 5000) {
                        addFeedMessage('⚠️ Need ₦5,000 to purchase official LASTMA Road Clearance Pass.');
                        return;
                      }
                      onBuyRoadClearancePass();
                      setOfficerDialogue(
                        'Marshal Balogun: "Pass issued! Your Danfo has been stamped with official Lagos State traffic clearance. Drive safely!"'
                      );
                    }}
                    disabled={walletNaira < 5000}
                    className={`w-full py-3 rounded-xl font-['Bungee'] text-xs transition-all shadow-lg flex items-center justify-center gap-2 ${
                      walletNaira >= 5000
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-stone-950 active:scale-95'
                        : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    <span>🛡️ BUY CLEARANCE PASS (₦5,000)</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-900/90 p-3 border-t border-stone-800 flex items-center justify-between shrink-0 text-[10px] font-mono text-stone-400">
          <span>ZONE 2 ENFORCEMENT COMMAND • EXPRESSWAY MILE 620</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-bold transition-all"
          >
            EXIT STATION
          </button>
        </div>
      </div>
    </div>
  );
};
