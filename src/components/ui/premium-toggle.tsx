import React from 'react';

interface PremiumToggleProps {
  checked: boolean;
  onChange: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

// Sizes: track | thumb | translateOn
const SIZE = {
  sm: { track: 'h-7 w-14',      thumb: 'h-5 w-5',  on: 'translate-x-7',  off: 'translate-x-1' },
  md: { track: 'h-9 w-[72px]',  thumb: 'h-7 w-7',  on: 'translate-x-9',  off: 'translate-x-1' },
  lg: { track: 'h-11 w-[88px]', thumb: 'h-9 w-9',  on: 'translate-x-11', off: 'translate-x-1' },
};

export const PremiumToggle: React.FC<PremiumToggleProps> = ({ checked, onChange, size = 'md', disabled = false }) => {
  const d = SIZE[size];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={[
        'relative inline-flex flex-shrink-0 cursor-pointer items-center rounded-full',
        'border-2 border-transparent transition-all duration-300 ease-in-out',
        'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#bc7e57]/30',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        d.track,
        checked
          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30'
          : 'bg-muted/70 dark:bg-muted',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block transform rounded-full bg-white',
          'shadow-xl ring-0 transition-all duration-300 ease-in-out',
          d.thumb,
          checked ? d.on : d.off,
        ].join(' ')}
      />
    </button>
  );
};

export default PremiumToggle;
