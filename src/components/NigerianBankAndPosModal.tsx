import React, { useState, useEffect } from 'react';
import { soundEngine } from '../audio/soundEngine';
import {
  X,
  Building2,
  CreditCard,
  Wallet,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Volume2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Receipt,
  Sparkles,
  FileText,
} from 'lucide-react';

export type BankingModalMode = 'POS_KIOSK' | 'BANK_HALL';

interface NigerianBankAndPosModalProps {
  isOpen: boolean;
  initialMode?: BankingModalMode;
  onClose: () => void;
  walletNaira: number;
  bankBalanceNaira: number;
  playerName: string;
  onUpdateBalances: (newWalletNaira: number, newBankBalanceNaira: number, logMessage: string) => void;
}

interface QueueCustomer {
  ticket: string;
  name: string;
  reason: string;
  bundles: number;
}

const INITIAL_QUEUE_AHEAD: QueueCustomer[] = [
  {
    ticket: 'B-041',
    name: 'Alhaji Musa (Spare Parts Dealer)',
    reason: 'Counting 4 bundles of ₦1,000 notes at Counter 2...',
    bundles: 4,
  },
  {
    ticket: 'B-042',
    name: 'Madam Ngozi (Balogun Market)',
    reason: 'Confirming BVN & bulk withdrawal slip signature...',
    bundles: 3,
  },
  {
    ticket: 'B-043',
    name: 'Chinedu (Auto Importer)',
    reason: 'Teller Tunde is running Naira notes through counting machine...',
    bundles: 5,
  },
];

export const NigerianBankAndPosModal: React.FC<NigerianBankAndPosModalProps> = ({
  isOpen,
  initialMode = 'POS_KIOSK',
  onClose,
  walletNaira,
  bankBalanceNaira,
  playerName,
  onUpdateBalances,
}) => {
  const [mode, setMode] = useState<BankingModalMode>(initialMode);

  // POS Kiosk States
  const [posAction, setPosAction] = useState<'WITHDRAW' | 'DEPOSIT'>('WITHDRAW');
  const [posAmountInput, setPosAmountInput] = useState<string>('20000');
  const [posError, setPosError] = useState<string | null>(null);
  const [posReceipt, setPosReceipt] = useState<{
    type: 'WITHDRAW' | 'DEPOSIT';
    amount: number;
    fee: number;
    ref: string;
    time: string;
  } | null>(null);

  // Bank Hall Queue & Teller States
  const [passedMantrap, setPassedMantrap] = useState<boolean>(false);
  const [hasTicket, setHasTicket] = useState<boolean>(false);
  const [playerTicket] = useState<string>('B-044');
  const [queueIndex, setQueueIndex] = useState<number>(0); // 0, 1, 2 = waiting behind INITIAL_QUEUE_AHEAD; 3 = PLAYER'S TURN AT TELLER!
  const [slipFilled, setSlipFilled] = useState<boolean>(false);
  const [tellerAction, setTellerAction] = useState<'WITHDRAW_BULK' | 'DEPOSIT_BULK'>('WITHDRAW_BULK');
  const [tellerAmountInput, setTellerAmountInput] = useState<string>('150000');
  const [isCountingCash, setIsCountingCash] = useState<boolean>(false);
  const [tellerError, setTellerError] = useState<string | null>(null);
  const [tellerReceipt, setTellerReceipt] = useState<{
    type: 'WITHDRAW_BULK' | 'DEPOSIT_BULK';
    amount: number;
    tellerName: string;
    ticket: string;
    ref: string;
    time: string;
  } | null>(null);

  // Sync mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setPosError(null);
      setTellerError(null);
    }
  }, [isOpen, initialMode]);

  // Automatic Queue Progression Timer inside Nigerian Banking Hall
  useEffect(() => {
    if (!isOpen || mode !== 'BANK_HALL' || !hasTicket || queueIndex >= INITIAL_QUEUE_AHEAD.length) {
      return;
    }

    const timer = setTimeout(() => {
      const nextIdx = queueIndex + 1;
      setQueueIndex(nextIdx);
      if (nextIdx < INITIAL_QUEUE_AHEAD.length) {
        const nextCustomer = INITIAL_QUEUE_AHEAD[nextIdx];
        soundEngine.playBankQueueChime(nextCustomer.ticket, 2, true);
      } else {
        // Player's turn at Counter 2!
        soundEngine.playBankQueueChime(playerTicket, 2, true);
      }
    }, 3200);

    return () => clearTimeout(timer);
  }, [isOpen, mode, hasTicket, queueIndex, playerTicket]);

  if (!isOpen) return null;

  // Calculate Nigerian Roadside POS Agent Fee (₦100 per ₦10k, max ₦1,000)
  const getPosFee = (amount: number): number => {
    if (amount <= 0) return 0;
    if (amount <= 5000) return 100;
    if (amount <= 10000) return 200;
    if (amount <= 20000) return 300;
    if (amount <= 50000) return 500;
    return 1000;
  };

  const parsedPosAmount = Math.max(0, Math.floor(Number(posAmountInput) || 0));
  const currentPosFee = getPosFee(parsedPosAmount);

  // Handle POS Withdraw / Deposit (Strict Max ₦100,000)
  const handlePosTransaction = () => {
    setPosError(null);
    setPosReceipt(null);

    if (parsedPosAmount <= 0) {
      soundEngine.playPosBeep(false);
      setPosError('Enter a valid Naira amount.');
      return;
    }

    if (parsedPosAmount > 100000) {
      soundEngine.playPosBeep(false);
      setPosError(
        'POS LIMIT EXCEEDED! Roadside POS maximum is ₦100,000. For withdrawals or deposits above ₦100,000, enter the Bank Hall and join the Teller Queue!'
      );
      return;
    }

    if (posAction === 'WITHDRAW') {
      const totalBankDebit = parsedPosAmount + currentPosFee;
      if (bankBalanceNaira < totalBankDebit) {
        soundEngine.playPosBeep(false);
        setPosError(
          `Insufficient Bank Balance! Need ₦${totalBankDebit.toLocaleString()} (including ₦${currentPosFee} POS agent charge) in your bank account.`
        );
        return;
      }

      soundEngine.playPosBeep(true);
      const nextWallet = walletNaira + parsedPosAmount;
      const nextBank = bankBalanceNaira - totalBankDebit;
      onUpdateBalances(
        nextWallet,
        nextBank,
        `💳 POS WITHDRAWAL: Collected ₦${parsedPosAmount.toLocaleString()} cash into Wallet (POS fee: ₦${currentPosFee}).`
      );
      setPosReceipt({
        type: 'WITHDRAW',
        amount: parsedPosAmount,
        fee: currentPosFee,
        ref: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } else {
      // DEPOSIT: Wallet Cash -> Bank Balance (max ₦100,000)
      const totalWalletNeeded = parsedPosAmount + currentPosFee;
      if (walletNaira < totalWalletNeeded) {
        soundEngine.playPosBeep(false);
        setPosError(
          `Insufficient Cash in Wallet! You need ₦${totalWalletNeeded.toLocaleString()} cash (including ₦${currentPosFee} POS fee) in your wallet.`
        );
        return;
      }

      soundEngine.playPosBeep(true);
      const nextWallet = walletNaira - totalWalletNeeded;
      const nextBank = bankBalanceNaira + parsedPosAmount;
      onUpdateBalances(
        nextWallet,
        nextBank,
        `💳 POS DEPOSIT: Sent ₦${parsedPosAmount.toLocaleString()} from Wallet to Bank Account (POS fee: ₦${currentPosFee}).`
      );
      setPosReceipt({
        type: 'DEPOSIT',
        amount: parsedPosAmount,
        fee: currentPosFee,
        ref: `POS-${Math.floor(100000 + Math.random() * 900000)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }
  };

  // Handle Entering Mantrap & Printing Queue Ticket
  const handleEnterBankAndPrintTicket = () => {
    soundEngine.playBankDoorMantrap();
    setPassedMantrap(true);
    setHasTicket(true);
    setQueueIndex(0);
    setTellerReceipt(null);
    setTellerError(null);
    setTimeout(() => {
      soundEngine.playBankQueueChime(INITIAL_QUEUE_AHEAD[0].ticket, 2, true);
    }, 650);
  };

  // Speed up queue by filling slip / alerting bank security
  const handleAdvanceQueueStep = () => {
    setSlipFilled(true);
    if (queueIndex < INITIAL_QUEUE_AHEAD.length) {
      const nextIdx = queueIndex + 1;
      setQueueIndex(nextIdx);
      if (nextIdx < INITIAL_QUEUE_AHEAD.length) {
        soundEngine.playBankQueueChime(INITIAL_QUEUE_AHEAD[nextIdx].ticket, 2, true);
      } else {
        soundEngine.playBankQueueChime(playerTicket, 2, true);
      }
    }
  };

  // Handle Bank Teller Transaction (Supports > ₦100,000 Bulk Withdrawals & Deposits)
  const parsedTellerAmount = Math.max(0, Math.floor(Number(tellerAmountInput) || 0));

  const handleTellerTransaction = () => {
    setTellerError(null);
    setTellerReceipt(null);

    if (parsedTellerAmount <= 0) {
      setTellerError('Please enter a valid Naira amount on your teller slip.');
      return;
    }

    if (tellerAction === 'WITHDRAW_BULK') {
      if (bankBalanceNaira < parsedTellerAmount) {
        soundEngine.playPosBeep(false);
        setTellerError(
          `Insufficient Bank Account Balance! Your account has ₦${bankBalanceNaira.toLocaleString()}, cannot withdraw ₦${parsedTellerAmount.toLocaleString()}.`
        );
        return;
      }

      // Play high-speed Nigerian bank cash counting machine then rubber stamp!
      setIsCountingCash(true);
      soundEngine.playBankCashCounter();

      setTimeout(() => {
        soundEngine.playBankTellerStamp();
        setIsCountingCash(false);
        const nextWallet = walletNaira + parsedTellerAmount;
        const nextBank = bankBalanceNaira - parsedTellerAmount;
        onUpdateBalances(
          nextWallet,
          nextBank,
          `🏦 BANK TELLER WITHDRAWAL: Collected ₦${parsedTellerAmount.toLocaleString()} crisp Naira bundles at Counter 2 (₦0 Fee)!`
        );
        setTellerReceipt({
          type: 'WITHDRAW_BULK',
          amount: parsedTellerAmount,
          tellerName: 'Tunde Adeleke (Bulk Teller #02)',
          ticket: playerTicket,
          ref: `ZEN-BLK-${Math.floor(100000 + Math.random() * 900000)}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }, 880);
    } else {
      // Bulk Cash Deposit (Wallet -> Bank)
      if (walletNaira < parsedTellerAmount) {
        soundEngine.playPosBeep(false);
        setTellerError(
          `Insufficient Wallet Cash! You only have ₦${walletNaira.toLocaleString()} cash in hand.`
        );
        return;
      }

      setIsCountingCash(true);
      soundEngine.playBankCashCounter();

      setTimeout(() => {
        soundEngine.playBankTellerStamp();
        setIsCountingCash(false);
        const nextWallet = walletNaira - parsedTellerAmount;
        const nextBank = bankBalanceNaira + parsedTellerAmount;
        onUpdateBalances(
          nextWallet,
          nextBank,
          `🏦 BANK TELLER DEPOSIT: Deposited ₦${parsedTellerAmount.toLocaleString()} cash into your Bank Account (₦0 Fee)!`
        );
        setTellerReceipt({
          type: 'DEPOSIT_BULK',
          amount: parsedTellerAmount,
          tellerName: 'Tunde Adeleke (Bulk Teller #02)',
          ticket: playerTicket,
          ref: `ZEN-DEP-${Math.floor(100000 + Math.random() * 900000)}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
      }, 880);
    }
  };

  const isPlayerTurnAtTeller = hasTicket && queueIndex >= INITIAL_QUEUE_AHEAD.length;
  const currentServingTicket = isPlayerTurnAtTeller
    ? playerTicket
    : hasTicket
    ? INITIAL_QUEUE_AHEAD[queueIndex]?.ticket || 'B-041'
    : 'B-040';
  const peopleAheadCount = hasTicket ? Math.max(0, INITIAL_QUEUE_AHEAD.length - queueIndex) : 3;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl bg-stone-900 border-2 border-amber-400/70 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col max-h-[94vh]">
        {/* TOP HEADER: WALLET VS BANK BALANCE & MODE SWITCHER */}
        <div className="bg-stone-950 border-b border-stone-800 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg border ${
                mode === 'POS_KIOSK'
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-rose-500/20 border-rose-400 text-rose-300'
              }`}
            >
              {mode === 'POS_KIOSK' ? <CreditCard className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-black text-base sm:text-lg text-white font-['Bungee'] tracking-wide leading-none">
                {mode === 'POS_KIOSK'
                  ? 'MAMA TOBI ROADSIDE POS AGENT'
                  : 'EKO ZENITH BANK PLC • BANKING HALL'}
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                {mode === 'POS_KIOSK'
                  ? 'Instant Cash Withdrawal & Deposit (Maximum ₦100,000 Limit)'
                  : 'Air-Conditioned Banking Hall • Queue for Teller Withdrawals Above ₦100,000'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WALLET (CASH IN HAND) VS BANK ACCOUNT COMPARISON BAR */}
        <div className="bg-stone-900/90 border-b border-stone-800 px-4 sm:px-6 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          {/* 1. Physical Cash Wallet */}
          <div className="p-3 rounded-2xl bg-stone-950 border border-emerald-500/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-stone-400 uppercase">Cash in Wallet (Pocket)</div>
              <div className="text-lg font-black font-mono text-emerald-400 tabular-nums mt-0.5">
                ₦{walletNaira.toLocaleString()}
              </div>
              <div className="text-[10px] text-stone-500">Used for fuel, mechanic & roadside</div>
            </div>
            <Wallet className="w-6 h-6 text-emerald-400/70 shrink-0" />
          </div>

          {/* 2. Nigerian Bank Account Balance */}
          <div className="p-3 rounded-2xl bg-stone-950 border border-sky-500/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-stone-400 uppercase">Bank Account Balance</div>
              <div className="text-lg font-black font-mono text-sky-400 tabular-nums mt-0.5">
                ₦{bankBalanceNaira.toLocaleString()}
              </div>
              <div className="text-[10px] text-stone-500">A/C: 2084910482 · {playerName}</div>
            </div>
            <Building2 className="w-6 h-6 text-sky-400/70 shrink-0" />
          </div>

          {/* 3. Mode Switcher Segmented Control */}
          <div className="p-1.5 rounded-2xl bg-stone-950 border border-stone-800 flex flex-col justify-center gap-1.5">
            <button
              onClick={() => setMode('POS_KIOSK')}
              className={`w-full py-2 px-3 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'POS_KIOSK'
                  ? 'bg-amber-400 text-stone-950 font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>POS Kiosk (≤₦100k)</span>
            </button>
            <button
              onClick={() => setMode('BANK_HALL')}
              className={`w-full py-2 px-3 rounded-xl font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'BANK_HALL'
                  ? 'bg-rose-500 text-white font-black shadow'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Enter Bank (&gt;₦100k)</span>
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* VIEW 1: ROADSIDE POS AGENT KIOSK (MAX ₦100,000 WITHDRAW / DEPOSIT)    */}
        {/* ==================================================================== */}
        {mode === 'POS_KIOSK' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left 7 cols: POS Terminal Controls */}
              <div className="md:col-span-7 space-y-4">
                {/* Action Toggle: Withdraw vs Deposit */}
                <div className="grid grid-cols-2 gap-2 bg-stone-950 p-1.5 rounded-2xl border border-stone-800">
                  <button
                    onClick={() => {
                      setPosAction('WITHDRAW');
                      setPosError(null);
                    }}
                    className={`py-2.5 px-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      posAction === 'WITHDRAW'
                        ? 'bg-emerald-500 text-stone-950 font-black shadow'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Withdraw Cash (Bank ➔ Wallet)</span>
                  </button>
                  <button
                    onClick={() => {
                      setPosAction('DEPOSIT');
                      setPosError(null);
                    }}
                    className={`py-2.5 px-3 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      posAction === 'DEPOSIT'
                        ? 'bg-sky-400 text-stone-950 font-black shadow'
                        : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Deposit Cash (Wallet ➔ Bank)</span>
                  </button>
                </div>

                {/* Preset Naira Amounts (Up to ₦100,000 Max + Over-100k Trigger) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-400">Select Amount (POS Max Limit: ₦100,000)</span>
                    <span className="text-amber-400 font-bold">Agent Fee: ₦{currentPosFee.toLocaleString()}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[5000, 10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => {
                          setPosAmountInput(String(amt));
                          setPosError(null);
                        }}
                        className={`py-2.5 px-3 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer tabular-nums ${
                          parsedPosAmount === amt
                            ? 'bg-amber-400 text-stone-950 border-amber-200 font-black'
                            : 'bg-stone-950 text-stone-200 border-stone-800 hover:border-stone-600'
                        }`}
                      >
                        ₦{amt.toLocaleString()}
                        {amt === 100000 && <span className="block text-[9px] opacity-80">MAX POS</span>}
                      </button>
                    ))}

                    <button
                      onClick={() => {
                        setPosAmountInput('150000');
                        soundEngine.playPosBeep(false);
                        setPosError(
                          'Above ₦100,000! POS Agent cannot dispense more than ₦100k. Click "Enter Bank Hall" below to join the teller queue.'
                        );
                      }}
                      className="py-2.5 px-3 rounded-xl font-mono text-xs font-bold border border-rose-500/50 bg-rose-950/30 text-rose-300 hover:bg-rose-950/60 transition-all cursor-pointer tabular-nums"
                    >
                      &gt; ₦100,000
                      <span className="block text-[9px] text-rose-400">Bank Hall Only</span>
                    </button>
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-stone-400 block">
                    Or Enter Custom Amount (₦1,000 – ₦100,000):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-black text-amber-400">
                      ₦
                    </span>
                    <input
                      type="number"
                      value={posAmountInput}
                      onChange={(e) => {
                        setPosAmountInput(e.target.value);
                        setPosError(null);
                      }}
                      className="w-full pl-8 pr-4 py-3 bg-stone-950 border border-stone-700 rounded-xl font-mono text-base font-bold text-white focus:outline-none focus:border-amber-400 tabular-nums"
                      placeholder="20000"
                    />
                  </div>
                </div>

                {/* Error or >100k Redirect Alert */}
                {posError && (
                  <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/70 space-y-2.5">
                    <div className="flex items-start gap-2.5 text-xs text-rose-200">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{posError}</span>
                    </div>
                    {parsedPosAmount > 100000 && (
                      <button
                        onClick={() => setMode('BANK_HALL')}
                        className="w-full py-2.5 px-4 bg-rose-500 hover:bg-rose-400 text-white font-mono font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Building2 className="w-4 h-4" />
                        <span>GO INTO THE BANK HALL (FOR &gt;₦100,000 WITHDRAWAL)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Confirm POS Button */}
                <button
                  onClick={handlePosTransaction}
                  className="w-full py-3.5 px-5 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-stone-950 font-black font-['Bungee'] text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>
                    {posAction === 'WITHDRAW'
                      ? `WITHDRAW ₦${parsedPosAmount.toLocaleString()} CASH AT POS`
                      : `DEPOSIT ₦${parsedPosAmount.toLocaleString()} AT POS`}
                  </span>
                </button>
              </div>

              {/* Right 5 cols: POS Agent Kiosk Visual & Thermal Receipt */}
              <div className="md:col-span-5 flex flex-col justify-between bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-sky-400">
                      ☂️ MONIEPOINT / OPAY KIOSK
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">Network: 4G Strong</span>
                  </div>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    "Oga Driver, welcome! My POS machine dey sharp. Maximum withdrawal or deposit na{' '}
                    <strong className="text-white">₦100,000</strong>. If you wan withdraw plenty money pass ₦100k,
                    enter Eko Zenith Bank across the road go join queue!"
                  </p>
                </div>

                {posReceipt ? (
                  <div className="p-3.5 bg-stone-100 text-stone-900 rounded-xl font-mono text-xs space-y-1.5 shadow-inner border-t-4 border-dashed border-stone-400">
                    <div className="text-center font-black border-b border-stone-300 pb-1">
                      *** MAMA TOBI POS RECEIPT ***
                    </div>
                    <div className="flex justify-between">
                      <span>TYPE:</span>
                      <span className="font-bold">{posReceipt.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AMOUNT:</span>
                      <span className="font-bold tabular-nums">₦{posReceipt.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AGENT CHARGE:</span>
                      <span className="tabular-nums">₦{posReceipt.fee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>REF:</span>
                      <span>{posReceipt.ref}</span>
                    </div>
                    <div className="text-center font-black text-emerald-700 pt-1 border-t border-stone-300">
                      APPROVED • {posReceipt.time}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-stone-900/70 border border-stone-800/80 text-center space-y-2">
                    <Receipt className="w-7 h-7 text-stone-500 mx-auto" />
                    <div className="text-xs text-stone-400 font-mono">
                      Insert debit card &amp; select up to ₦100,000 to print thermal POS slip.
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setMode('BANK_HALL')}
                  className="w-full py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-mono font-bold text-amber-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Need &gt;₦100,000? Enter Bank Branch Hall ➔</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* VIEW 2: BUILT-OUT NIGERIAN BANK HALL (QUEUE + TELLER FOR >₦100K)     */}
        {/* ==================================================================== */}
        {mode === 'BANK_HALL' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
            {/* TOP SOUND & QMS DISPLAY HEADER */}
            <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-2 rounded-xl bg-black border-2 border-rose-500/80 font-mono text-center shadow-inner">
                  <div className="text-[9px] text-stone-400 uppercase">QMS TOKEN DISPLAY</div>
                  <div className="text-lg sm:text-xl font-black text-rose-500 tracking-widest tabular-nums">
                    {currentServingTicket} ➔ CTR 02
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Banking Hall Queue Management System</span>
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    {!hasTicket
                      ? 'Step through the security mantrap door to collect your queue ticket.'
                      : isPlayerTurnAtTeller
                      ? `🔔 NOW SERVING YOUR TICKET (${playerTicket}) AT COUNTER 2 (BULK CASH)!`
                      : `Your Ticket: ${playerTicket} • ${peopleAheadCount} customer(s) ahead of you in queue`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => soundEngine.playBankQueueChime(currentServingTicket, 2, true)}
                className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-amber-400/50 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                title="Play Authentic Nigerian Bank Hall Queue Chime & Voice Call"
              >
                <Volume2 className="w-4 h-4 text-amber-400" />
                <span>Test Bank Hall Chime</span>
              </button>
            </div>

            {/* 2D ARCHITECTURAL FLOORPLAN OF THE NIGERIAN BANK HALL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEFT 6 COLS: VISUAL BANKING HALL (TELLER CUBICLES, QUEUE LINE & SECURITY POD) */}
              <div className="lg:col-span-6 bg-stone-950 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-xs font-mono font-bold text-stone-300">
                    🏛️ MARBLE BANKING HALL FLOOR (AC: 18°C)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400">CBN Cash Policy Active</span>
                </div>

                {/* 3 TELLER COUNTER CUBICLES BEHIND BULLETPROOF GLASS */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-center space-y-1">
                    <div className="text-[10px] font-mono text-stone-400">COUNTER 01</div>
                    <div className="text-lg">👩🏾‍💼</div>
                    <div className="text-[11px] font-bold text-stone-200">Teller Amaka</div>
                    <div className="text-[9px] font-mono text-stone-400">Savings / Coins</div>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border text-center space-y-1 transition-all ${
                      isPlayerTurnAtTeller
                        ? 'bg-emerald-950/50 border-emerald-400 ring-1 ring-emerald-400'
                        : 'bg-stone-900 border-amber-400/50'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold text-amber-400">COUNTER 02 (BULK)</div>
                    <div className="text-lg">👨🏾‍💼💵</div>
                    <div className="text-[11px] font-bold text-white">Teller Tunde</div>
                    <div className="text-[9px] font-mono text-emerald-400 font-bold">
                      &gt;₦100k Cash Bundle
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-center space-y-1">
                    <div className="text-[10px] font-mono text-stone-400">COUNTER 03</div>
                    <div className="text-lg">🧑🏾‍💻</div>
                    <div className="text-[11px] font-bold text-stone-200">Customer Care</div>
                    <div className="text-[9px] font-mono text-stone-400">BVN / NIN Link</div>
                  </div>
                </div>

                {/* LIVE QUEUE STANCHION LINE */}
                <div className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-stone-400 font-bold">BULK TELLER QUEUE LINE</span>
                    <span className="text-amber-400">
                      {hasTicket ? `Your Token: #${playerTicket}` : 'No Ticket Yet'}
                    </span>
                  </div>

                  {!hasTicket ? (
                    <div className="py-4 text-center space-y-3">
                      <p className="text-xs text-stone-300">
                        Pass through the electronic security mantrap tube door and print your queue token to join the
                        line for Bulk Teller #02.
                      </p>
                      <button
                        onClick={handleEnterBankAndPrintTicket}
                        className="px-4 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black font-['Bungee'] text-xs rounded-xl shadow-lg inline-flex items-center gap-2 cursor-pointer"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>STEP INTO SECURITY MANTRAP &amp; TAKE QUEUE TICKET</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {INITIAL_QUEUE_AHEAD.map((cust, idx) => {
                        const isDone = idx < queueIndex;
                        const isBeingServed = idx === queueIndex;
                        return (
                          <div
                            key={cust.ticket}
                            className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 ${
                              isDone
                                ? 'bg-stone-950/50 border-stone-800/50 text-stone-500 line-through'
                                : isBeingServed
                                ? 'bg-amber-400/15 border-amber-400 text-white'
                                : 'bg-stone-950 border-stone-800 text-stone-300'
                            }`}
                          >
                            <div className="truncate">
                              <span className="font-bold text-amber-400 mr-2">#{cust.ticket}</span>
                              <span>{cust.name}</span>
                              {isBeingServed && (
                                <span className="block text-[10px] text-emerald-300 mt-0.5">{cust.reason}</span>
                              )}
                            </div>
                            <span className="text-[10px] shrink-0">
                              {isDone ? 'SERVED' : isBeingServed ? 'AT COUNTER 2' : 'WAITING'}
                            </span>
                          </div>
                        );
                      })}

                      {/* PLAYER QUEUE ROW */}
                      <div
                        className={`px-3 py-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                          isPlayerTurnAtTeller
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black'
                            : 'bg-stone-950 border-sky-500/50 text-sky-300 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>🧑🏾‍✈️ #{playerTicket}</span>
                          <span>YOU ({playerName})</span>
                        </div>
                        <span>
                          {isPlayerTurnAtTeller
                            ? '✅ PROCEED TO COUNTER 2!'
                            : `⏳ WAITING (${peopleAheadCount} AHEAD)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* QUEUE HELPER BUTTON WHILE WAITING */}
                {hasTicket && !isPlayerTurnAtTeller && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] font-mono text-stone-400">
                      Queue advances automatically every 3 seconds...
                    </span>
                    <button
                      onClick={handleAdvanceQueueStep}
                      className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-amber-400 hover:text-stone-950 text-amber-300 font-mono font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{slipFilled ? 'Call Next Token Now' : 'Fill Bulk Slip & Speed Up Queue'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT 6 COLS: COUNTER 02 TELLER INTERACTION WINDOW (FOR >₦100,000 WITHDRAWALS) */}
              <div className="lg:col-span-6 bg-stone-950 border border-stone-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                {!isPlayerTurnAtTeller ? (
                  <div className="my-auto py-8 px-4 text-center space-y-3">
                    <Clock className="w-10 h-10 text-amber-400 mx-auto" />
                    <h3 className="text-base font-black text-white font-['Bungee']">
                      {hasTicket ? 'WAITING IN QUEUE FOR COUNTER 02...' : 'TAKE A QUEUE TICKET FIRST'}
                    </h3>
                    <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
                      In Nigerian banks, withdrawals above <strong className="text-white">₦100,000</strong> require
                      waiting in the banking hall queue to meet the Bulk Cash Teller across the counter.
                    </p>
                    {hasTicket && (
                      <div className="pt-2">
                        <button
                          onClick={handleAdvanceQueueStep}
                          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-black text-xs rounded-xl shadow cursor-pointer"
                        >
                          ⏩ Call Next Customer in Line ({peopleAheadCount} left)
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase">
                          COUNTER 02 • BULK CASH TELLER WINDOW
                        </div>
                        <div className="text-xs font-bold text-white mt-0.5">
                          Teller Tunde: "Welcome Oga {playerName}! Ticket #{playerTicket}. How much bulk cash you wan
                          withdraw or deposit today?"
                        </div>
                      </div>
                    </div>

                    {/* Teller Action Toggle */}
                    <div className="grid grid-cols-2 gap-2 bg-stone-900 p-1.5 rounded-xl border border-stone-800">
                      <button
                        onClick={() => {
                          setTellerAction('WITHDRAW_BULK');
                          setTellerError(null);
                        }}
                        className={`py-2 px-3 rounded-lg font-mono text-xs font-bold cursor-pointer ${
                          tellerAction === 'WITHDRAW_BULK'
                            ? 'bg-emerald-500 text-stone-950 font-black'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        Bulk Withdrawal (&gt;₦100k)
                      </button>
                      <button
                        onClick={() => {
                          setTellerAction('DEPOSIT_BULK');
                          setTellerError(null);
                        }}
                        className={`py-2 px-3 rounded-lg font-mono text-xs font-bold cursor-pointer ${
                          tellerAction === 'DEPOSIT_BULK'
                            ? 'bg-sky-400 text-stone-950 font-black'
                            : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        Bulk Cash Deposit
                      </button>
                    </div>

                    {/* Bulk Amount Presets (>₦100,000) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-stone-400">Select Bulk Teller Amount:</span>
                        <span className="text-emerald-400 font-bold">₦0 Teller Fee</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[120000, 150000, 200000, 250000, 500000].map((amt) => (
                          <button
                            key={amt}
                            onClick={() => {
                              setTellerAmountInput(String(amt));
                              setTellerError(null);
                            }}
                            className={`py-2 px-2.5 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer tabular-nums ${
                              parsedTellerAmount === amt
                                ? 'bg-amber-400 text-stone-950 border-amber-200 font-black'
                                : 'bg-stone-900 text-stone-200 border-stone-800 hover:border-stone-600'
                            }`}
                          >
                            ₦{amt.toLocaleString()}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            const maxAmt =
                              tellerAction === 'WITHDRAW_BULK' ? bankBalanceNaira : walletNaira;
                            setTellerAmountInput(String(Math.max(0, maxAmt)));
                            setTellerError(null);
                          }}
                          className="py-2 px-2.5 rounded-xl font-mono text-xs font-bold border border-emerald-500/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-950/60 cursor-pointer"
                        >
                          MAX ALL
                        </button>
                      </div>
                    </div>

                    {/* Custom Bulk Slip Input */}
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-stone-400 block">
                        Amount Written on Bank Teller Slip (₦):
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-black text-amber-400">
                          ₦
                        </span>
                        <input
                          type="number"
                          value={tellerAmountInput}
                          onChange={(e) => {
                            setTellerAmountInput(e.target.value);
                            setTellerError(null);
                          }}
                          className="w-full pl-8 pr-4 py-2.5 bg-stone-900 border border-stone-700 rounded-xl font-mono text-base font-bold text-white focus:outline-none focus:border-emerald-400 tabular-nums"
                        />
                      </div>
                    </div>

                    {tellerError && (
                      <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/70 text-xs text-rose-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{tellerError}</span>
                      </div>
                    )}

                    {/* Submit to Teller Button (Triggers Cash Counting Machine + Rubber Stamp) */}
                    <button
                      onClick={handleTellerTransaction}
                      disabled={isCountingCash}
                      className="w-full py-3.5 px-5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-800 text-stone-950 font-black font-['Bungee'] text-xs sm:text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {isCountingCash ? (
                        <span>💵 COUNTING NAIRA BUNDLES (FRRRRRR-BEEP)...</span>
                      ) : tellerAction === 'WITHDRAW_BULK' ? (
                        <span>
                          🏦 WITHDRAW ₦{parsedTellerAmount.toLocaleString()} FROM BANK TELLER
                        </span>
                      ) : (
                        <span>
                          🏦 DEPOSIT ₦{parsedTellerAmount.toLocaleString()} WITH BANK TELLER
                        </span>
                      )}
                    </button>

                    {/* Official Stamped Bank Teller Slip */}
                    {tellerReceipt && (
                      <div className="p-3 bg-amber-50 text-stone-900 rounded-xl font-mono text-xs space-y-1 border-2 border-stone-400 relative">
                        <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                          <span className="font-black text-rose-700">EKO ZENITH BANK PLC • TELLER SLIP</span>
                          <span className="px-1.5 py-0.5 rounded border border-emerald-700 text-emerald-800 font-black text-[10px]">
                            STAMPED &amp; PAID
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>CUSTOMER:</span>
                          <span className="font-bold">{playerName} (Token #{tellerReceipt.ticket})</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TRANSACTION:</span>
                          <span className="font-bold">
                            {tellerReceipt.type === 'WITHDRAW_BULK' ? 'CASH WITHDRAWAL' : 'CASH DEPOSIT'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>AMOUNT:</span>
                          <span className="font-black text-sm tabular-nums">
                            ₦{tellerReceipt.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-600">
                          <span>{tellerReceipt.tellerName}</span>
                          <span>{tellerReceipt.ref} • {tellerReceipt.time}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
