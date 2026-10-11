import React, { useEffect, useRef } from 'react';
import nipplejs from 'nipplejs';

interface NippleJoystickProps {
  onMove: (vector: { x: number; y: number }, distance: number) => void;
  onEnd: () => void;
  size?: number;
  color?: string;
  className?: string;
  label?: string;
}

export const NippleJoystick: React.FC<NippleJoystickProps> = ({
  onMove,
  onEnd,
  size = 110,
  color = '#f59e0b', // Lagos Danfo Amber Yellow
  className = '',
  label = 'STEERING',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const manager = nipplejs.create({
      zone: containerRef.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: color,
      size: size,
      restOpacity: 0.7,
      fadeTime: 150,
      threshold: 0.1,
    });

    managerRef.current = manager;

    (manager as any).on('move', (_evt: any, data: any) => {
      if (data && data.vector) {
        onMove({ x: data.vector.x, y: data.vector.y }, data.distance || 0);
      }
    });

    (manager as any).on('end', () => {
      onEnd();
    });

    return () => {
      try {
        manager.destroy();
      } catch {}
    };
  }, [onMove, onEnd, size, color]);

  return (
    <div className={`relative flex flex-col items-center select-none touch-none ${className}`}>
      <div
        ref={containerRef}
        style={{ width: `${size + 24}px`, height: `${size + 24}px` }}
        className="relative rounded-full bg-stone-950/70 border-2 border-amber-400/50 shadow-[0_4px_16px_rgba(0,0,0,0.8)] backdrop-blur-sm"
      />
      {label && (
        <span className="mt-1 text-[8px] font-mono font-black text-amber-400 tracking-wider">
          {label}
        </span>
      )}
    </div>
  );
};
