import React from "react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  illustration: "tasks" | "leave" | "clients" | "finance" | "documents" | "social" | "attendance" | "staff" | "ops" | "recycle" | "payments" | "budgets" | "notifications";
  heading: string;
  subtext: string;
  ctaText?: string;
  onCta?: () => void;
}

const illustrations: Record<string, React.ReactNode> = {
  tasks: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Clipboard base */}
      <rect x="45" y="30" width="110" height="120" rx="10" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="2"/>
      {/* Clipboard top clip */}
      <rect x="75" y="22" width="50" height="18" rx="9" fill="#d4b89a"/>
      <rect x="83" y="25" width="34" height="12" rx="6" fill="#c4a882"/>
      {/* Check lines */}
      <line x1="65" y1="70" x2="135" y2="70" stroke="#e8ddd5" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="65" y1="88" x2="120" y2="88" stroke="#e8ddd5" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="65" y1="106" x2="110" y2="106" stroke="#e8ddd5" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Checkmark circle */}
      <circle cx="58" cy="70" r="5" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="58" cy="88" r="5" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
      <circle cx="58" cy="106" r="5" fill="none" stroke="hsl(var(--primary))" strokeWidth="2"/>
      {/* Pencil */}
      <rect x="128" y="90" width="10" height="35" rx="2" fill="#C4622D" transform="rotate(-35, 133, 107)"/>
      <polygon points="119,128 122,135 129,130" fill="#8a5c3a"/>
      <rect x="129" y="89" width="10" height="6" rx="0" fill="#e8c49a" transform="rotate(-35, 134, 92)"/>
    </svg>
  ),
  leave: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Calendar base */}
      <rect x="35" y="35" width="130" height="110" rx="12" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="2"/>
      {/* Calendar header */}
      <rect x="35" y="35" width="130" height="38" rx="12" fill="#C4622D"/>
      <rect x="35" y="55" width="130" height="18" fill="#C4622D"/>
      {/* Calendar rings */}
      <rect x="65" y="25" width="8" height="20" rx="4" fill="#8a5c3a"/>
      <rect x="127" y="25" width="8" height="20" rx="4" fill="#8a5c3a"/>
      {/* Calendar label */}
      <text x="100" y="57" textAnchor="middle" fill="white" fontSize="12" fontFamily="sans-serif" fontWeight="600">MARCH 2026</text>
      {/* Grid cells */}
      {[0,1,2,3,4,5,6].map(i => (
        <text key={i} x={48 + i * 17} y="84" textAnchor="middle" fill="#d4b89a" fontSize="8" fontFamily="sans-serif">{['M','T','W','T','F','S','S'][i]}</text>
      ))}
      {/* Date numbers */}
      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map((d, i) => {
        const row = Math.floor(i / 7);
        const col = i % 7;
        const isHighlighted = d === 10 || d === 11 || d === 12;
        return (
          <g key={d}>
            {isHighlighted && <rect x={42 + col * 17 - 7} y={92 + row * 17 - 7} width="14" height="14" rx="7" fill="#C4622D" opacity="0.2"/>}
            <text x={48 + col * 17} y={100 + row * 17} textAnchor="middle" fill={isHighlighted ? "#C4622D" : "#9a8070"} fontSize="9" fontFamily="sans-serif" fontWeight={isHighlighted ? "700" : "400"}>{d}</text>
          </g>
        );
      })}
      {/* Suitcase */}
      <rect x="130" y="110" width="30" height="22" rx="4" fill="#C4622D"/>
      <rect x="138" y="104" width="14" height="8" rx="3" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5"/>
      <line x1="130" y1="121" x2="160" y2="121" stroke="#8a5c3a" strokeWidth="1.5"/>
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Handshake */}
      <ellipse cx="100" cy="145" rx="65" ry="8" fill="#f0ece8" opacity="0.6"/>
      {/* Left arm */}
      <path d="M20 100 Q35 85 55 90 L85 95" stroke="#d4b89a" strokeWidth="12" strokeLinecap="round" fill="none"/>
      {/* Right arm */}
      <path d="M180 100 Q165 85 145 90 L115 95" stroke="hsl(var(--primary))" strokeWidth="12" strokeLinecap="round" fill="none"/>
      {/* Handshake join */}
      <ellipse cx="100" cy="95" rx="22" ry="14" fill="#c8956a"/>
      <ellipse cx="100" cy="90" rx="18" ry="10" fill="#d4a87a"/>
      {/* Fingers left */}
      <path d="M80 90 L72 75" stroke="#d4b89a" strokeWidth="7" strokeLinecap="round"/>
      <path d="M87 87 L81 70" stroke="#d4b89a" strokeWidth="7" strokeLinecap="round"/>
      <path d="M94 86 L90 68" stroke="#d4b89a" strokeWidth="7" strokeLinecap="round"/>
      {/* Fingers right */}
      <path d="M106 86 L110 68" stroke="hsl(var(--primary))" strokeWidth="7" strokeLinecap="round"/>
      <path d="M113 87 L119 70" stroke="hsl(var(--primary))" strokeWidth="7" strokeLinecap="round"/>
      <path d="M120 90 L128 75" stroke="hsl(var(--primary))" strokeWidth="7" strokeLinecap="round"/>
      {/* Stars */}
      <text x="50" y="55" fontSize="16" fill="#C4622D" opacity="0.8">✦</text>
      <text x="140" y="45" fontSize="12" fill="#d4b89a">✦</text>
      <text x="25" y="75" fontSize="10" fill="#e8ddd5">✦</text>
    </svg>
  ),
  finance: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Ledger book */}
      <rect x="30" y="30" width="90" height="115" rx="8" fill="#C4622D"/>
      <rect x="35" y="25" width="90" height="115" rx="8" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="1.5"/>
      {/* Lines */}
      {[55,70,85,100,115].map(y => <line key={y} x1="50" y1={y} x2="110" y2={y} stroke="#e8ddd5" strokeWidth="1.5" strokeLinecap="round"/>)}
      {/* ₦ symbol */}
      <text x="73" y="48" textAnchor="middle" fill="#C4622D" fontSize="16" fontWeight="bold" fontFamily="serif">₦</text>
      {/* Amounts */}
      {[55,70,85,100,115].map((y, i) => (
        <text key={y} x="108" y={y - 2} textAnchor="end" fill="#c4a882" fontSize="8" fontFamily="sans-serif">{['4,200','1,800','9,500','3,100','6,700'][i]}</text>
      ))}
      {/* Coin stack */}
      {[130, 124, 118].map((y, i) => (
        <ellipse key={y} cx="155" cy={y} rx="20" ry="7" fill={['#C4622D','#c88a60','#d49a70'][i]}/>
      ))}
      <ellipse cx="155" cy="112" rx="20" ry="7" fill="#e0aa80" stroke="hsl(var(--primary))" strokeWidth="1"/>
      <text x="155" y="115" textAnchor="middle" fill="#8a5c3a" fontSize="9" fontWeight="bold" fontFamily="serif">₦</text>
    </svg>
  ),
  documents: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Back doc */}
      <rect x="60" y="30" width="75" height="100" rx="6" fill="#e8ddd5" stroke="#d4c4b0" strokeWidth="1.5"/>
      {/* Middle doc */}
      <rect x="53" y="38" width="75" height="100" rx="6" fill="#f0e8df" stroke="#e0d0c0" strokeWidth="1.5"/>
      {/* Front doc */}
      <rect x="45" y="25" width="80" height="105" rx="8" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="2"/>
      {/* Dog ear */}
      <path d="M105 25 L125 45 L105 45 Z" fill="#e8ddd5"/>
      <path d="M105 25 L125 25 L125 45 Z" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="1"/>
      {/* Lines */}
      {[65,78,91,104,117].map(y => <line key={y} x1="58" y1={y} x2="115" y2={y} stroke="#e8ddd5" strokeWidth="2" strokeLinecap="round"/>)}
      <line x1="58" y1="52" x2="100" y2="52" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"/>
      {/* Upload arrow */}
      <circle cx="148" cy="110" r="22" fill="#C4622D" opacity="0.12" stroke="hsl(var(--primary))" strokeWidth="1.5"/>
      <path d="M148 122 L148 100" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M140 108 L148 100 L156 108" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  social: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Phone */}
      <rect x="65" y="20" width="70" height="125" rx="14" fill="#2d2d2d"/>
      <rect x="70" y="28" width="60" height="108" rx="8" fill="#f8f4f0"/>
      {/* Notch */}
      <rect x="85" y="20" width="30" height="10" rx="5" fill="#1a1a1a"/>
      {/* Post image placeholder */}
      <rect x="73" y="35" width="54" height="48" rx="4" fill="#e8ddd5"/>
      <circle cx="100" cy="52" r="12" fill="#d4b89a"/>
      <path d="M82 83 Q100 65 118 83" fill="#d4b89a"/>
      {/* Like / comment icons */}
      <text x="75" y="100" fontSize="11" fill="#C4622D">♥</text>
      <text x="90" y="100" fontSize="9" fill="#c4a882">21</text>
      <rect x="104" y="91" width="18" height="9" rx="4" fill="#f0e8df"/>
      {/* Stars / sparkles */}
      <text x="18" y="60" fontSize="20" fill="#C4622D" opacity="0.4">✦</text>
      <text x="155" y="50" fontSize="14" fill="#d4b89a" opacity="0.6">✦</text>
      <text x="30" y="120" fontSize="10" fill="#e8ddd5">✦</text>
      <text x="158" y="100" fontSize="18" fill="#C4622D" opacity="0.3">✦</text>
    </svg>
  ),
  attendance: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Clock face */}
      <circle cx="100" cy="85" r="55" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="3"/>
      <circle cx="100" cy="85" r="49" fill="white"/>
      {/* Tick marks */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => {
        const rad = (deg - 90) * Math.PI / 180;
        const isHour = deg % 90 === 0;
        const inner = isHour ? 37 : 41;
        return <line key={deg}
          x1={100 + inner * Math.cos(rad)} y1={85 + inner * Math.sin(rad)}
          x2={100 + 47 * Math.cos(rad)} y2={85 + 47 * Math.sin(rad)}
          stroke={isHour ? "#C4622D" : "#e8ddd5"} strokeWidth={isHour ? "3" : "1.5"}
          strokeLinecap="round"/>;
      })}
      {/* Hour hand (pointing to 9) */}
      <line x1="100" y1="85" x2="70" y2="85" stroke="#2d2d2d" strokeWidth="4" strokeLinecap="round"/>
      {/* Minute hand (pointing to 12) */}
      <line x1="100" y1="85" x2="100" y2="50" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round"/>
      {/* Centre dot */}
      <circle cx="100" cy="85" r="4" fill="#C4622D"/>
      {/* Check badge */}
      <circle cx="145" cy="130" r="16" fill="#C4622D"/>
      <path d="M137 130 L142 136 L153 124" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Chart bars */}
      <rect x="30" y="130" width="140" height="2" rx="1" fill="#e8ddd5"/>
      {/* Bar 1 */}
      <rect x="42" y="75" width="22" height="55" rx="4" fill="#e8ddd5"/>
      <rect x="42" y="95" width="22" height="35" rx="4" fill="#C4622D" opacity="0.4"/>
      {/* Bar 2 */}
      <rect x="74" y="50" width="22" height="80" rx="4" fill="#e8ddd5"/>
      <rect x="74" y="60" width="22" height="70" rx="4" fill="#C4622D" opacity="0.6"/>
      {/* Bar 3 */}
      <rect x="106" y="65" width="22" height="65" rx="4" fill="#e8ddd5"/>
      <rect x="106" y="80" width="22" height="50" rx="4" fill="#C4622D" opacity="0.5"/>
      {/* Bar 4 */}
      <rect x="138" y="40" width="22" height="90" rx="4" fill="#e8ddd5"/>
      <rect x="138" y="42" width="22" height="88" rx="4" fill="#C4622D" opacity="0.8"/>
      {/* People icons */}
      <circle cx="53" cy="65" r="8" fill="#d4b89a"/>
      <ellipse cx="53" cy="82" rx="10" ry="5" fill="#d4b89a" opacity="0"/>
      <circle cx="85" cy="45" r="8" fill="#C4622D"/>
      <circle cx="117" cy="55" r="8" fill="#d4a07a"/>
      <circle cx="149" cy="30" r="8" fill="#C4622D"/>
    </svg>
  ),
  ops: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Road */}
      <rect x="10" y="115" width="180" height="30" rx="4" fill="#e8ddd5"/>
      <line x1="100" y1="115" x2="100" y2="145" stroke="white" strokeWidth="3" strokeDasharray="8,6"/>
      {/* Van body */}
      <rect x="25" y="75" width="110" height="45" rx="8" fill="#C4622D"/>
      {/* Van cabin */}
      <rect x="115" y="82" width="45" height="38" rx="6" fill="#8a5c3a"/>
      {/* Windshield */}
      <rect x="120" y="86" width="32" height="20" rx="4" fill="#b8d4e8" opacity="0.8"/>
      {/* Wheels */}
      <circle cx="60" cy="122" r="14" fill="#4a4a4a"/>
      <circle cx="60" cy="122" r="8" fill="#7a7a7a"/>
      <circle cx="60" cy="122" r="3" fill="#d4b89a"/>
      <circle cx="140" cy="122" r="14" fill="#4a4a4a"/>
      <circle cx="140" cy="122" r="8" fill="#7a7a7a"/>
      <circle cx="140" cy="122" r="3" fill="#d4b89a"/>
      {/* Package */}
      <rect x="45" y="82" width="50" height="35" rx="4" fill="#f0e8da" stroke="#d4b89a" strokeWidth="1.5"/>
      <line x1="70" y1="82" x2="70" y2="117" stroke="#d4b89a" strokeWidth="1.5"/>
      <line x1="45" y1="100" x2="95" y2="100" stroke="#d4b89a" strokeWidth="1.5"/>
      {/* Motion lines */}
      <line x1="8" y1="95" x2="22" y2="95" stroke="#d4b89a" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
      <line x1="5" y1="103" x2="20" y2="103" stroke="#d4b89a" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <line x1="10" y1="111" x2="22" y2="111" stroke="#d4b89a" strokeWidth="2" strokeLinecap="round" opacity="0.3"/>
    </svg>
  ),
  recycle: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Bin */}
      <rect x="55" y="55" width="90" height="85" rx="6" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="2"/>
      <rect x="45" y="40" width="110" height="18" rx="6" fill="#e8ddd5"/>
      {/* Lines */}
      <line x1="80" y1="40" x2="80" y2="58" stroke="#c4b0a0" strokeWidth="2"/>
      <line x1="120" y1="40" x2="120" y2="58" stroke="#c4b0a0" strokeWidth="2"/>
      {/* Handle */}
      <rect x="82" y="32" width="36" height="10" rx="5" fill="#e8ddd5" stroke="#d4c4b0" strokeWidth="1.5"/>
      {/* Vertical dividers */}
      <line x1="80" y1="65" x2="80" y2="132" stroke="#e8ddd5" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="100" y1="65" x2="100" y2="132" stroke="#e8ddd5" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="120" y1="65" x2="120" y2="132" stroke="#e8ddd5" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Recycle arrow */}
      <text x="100" y="110" textAnchor="middle" fontSize="28" fill="#C4622D" opacity="0.35">♻</text>
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Card */}
      <rect x="30" y="45" width="140" height="90" rx="12" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="2"/>
      <rect x="30" y="45" width="140" height="35" rx="12" fill="#C4622D"/>
      <rect x="30" y="66" width="140" height="14" fill="#C4622D"/>
      {/* Chip */}
      <rect x="48" y="58" width="24" height="18" rx="4" fill="#d4a870"/>
      <line x1="48" y1="66" x2="72" y2="66" stroke="#b8925c" strokeWidth="1"/>
      <line x1="60" y1="58" x2="60" y2="76" stroke="#b8925c" strokeWidth="1"/>
      {/* Card number dots */}
      {[0,1,2,3].map(g => (
        [0,1,2,3].map(d => (
          <circle key={`${g}${d}`} cx={55 + g * 30 + d * 5} cy="105" r="2" fill="#d4b89a"/>
        ))
      ))}
      {/* Amount */}
      <text x="155" y="128" textAnchor="end" fill="#C4622D" fontSize="14" fontWeight="bold" fontFamily="sans-serif">₦ —</text>
      <text x="48" y="128" fill="#c4a882" fontSize="9" fontFamily="sans-serif">PENDING APPROVAL</text>
      {/* Clock badge */}
      <circle cx="148" cy="48" r="16" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="1.5"/>
      <circle cx="148" cy="48" r="11" fill="white"/>
      <line x1="148" y1="48" x2="148" y2="40" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="148" y1="48" x2="154" y2="48" stroke="#9a8070" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="148" cy="48" r="2" fill="#C4622D"/>
    </svg>
  ),
  budgets: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Pie chart */}
      <circle cx="100" cy="88" r="52" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="2"/>
      {/* Pie slices */}
      <path d="M100 88 L100 36 A52 52 0 0 1 145 114 Z" fill="#C4622D" opacity="0.85"/>
      <path d="M100 88 L145 114 A52 52 0 0 1 60 134 Z" fill="#d4a870" opacity="0.7"/>
      <path d="M100 88 L60 134 A52 52 0 0 1 52 60 Z" fill="#e8c49a" opacity="0.6"/>
      <path d="M100 88 L52 60 A52 52 0 0 1 100 36 Z" fill="#f0dac0" opacity="0.5"/>
      {/* Centre */}
      <circle cx="100" cy="88" r="22" fill="white"/>
      <text x="100" y="84" textAnchor="middle" fill="#C4622D" fontSize="9" fontFamily="sans-serif" fontWeight="600">Q1</text>
      <text x="100" y="96" textAnchor="middle" fill="#C4622D" fontSize="11" fontFamily="sans-serif" fontWeight="bold">2026</text>
      {/* Legend dots */}
      <circle cx="45" cy="28" r="5" fill="#C4622D"/>
      <text x="55" y="32" fill="#9a8070" fontSize="9" fontFamily="sans-serif">Operations</text>
      <circle cx="110" cy="28" r="5" fill="#d4a870"/>
      <text x="120" y="32" fill="#9a8070" fontSize="9" fontFamily="sans-serif">Salaries</text>
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Bell */}
      <path d="M100 25 C78 25 62 42 62 65 L58 105 L142 105 L138 65 C138 42 122 25 100 25Z" fill="#f8f4f0" stroke="#e8ddd5" strokeWidth="2.5"/>
      {/* Bell top */}
      <circle cx="100" cy="25" r="6" fill="#d4b89a"/>
      {/* Clapper */}
      <ellipse cx="100" cy="112" rx="14" ry="8" fill="#d4b89a" stroke="#e8ddd5" strokeWidth="1.5"/>
      {/* Inner shading */}
      <path d="M68 92 L132 92 L136 105 L64 105 Z" fill="#f0e8df"/>
      {/* Sparkle lines */}
      <line x1="148" y1="45" x2="158" y2="38" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <line x1="152" y1="55" x2="163" y2="55" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      <line x1="148" y1="65" x2="158" y2="72" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <line x1="52" y1="45" x2="42" y2="38" stroke="#d4b89a" strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
      <line x1="48" y1="55" x2="37" y2="55" stroke="#d4b89a" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      {/* Badge dot */}
      <circle cx="135" cy="35" r="10" fill="#C4622D"/>
      <text x="135" y="39" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">0</text>
    </svg>
  ),
};

export const EmptyState = ({ illustration, heading, subtext, ctaText, onCta }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-48 h-36 mb-6 select-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(188,126,87,0.10))' }}>
        {illustrations[illustration]}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{heading}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">{subtext}</p>
      {ctaText && onCta && (
        <button
          onClick={onCta}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-85 active:scale-95"
          style={{ backgroundColor: '#C4622D' }}
        >
          {ctaText}
        </button>
      )}
    </div>
  );
};
