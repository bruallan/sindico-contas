import React from 'react';

interface CentriaxLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
  collapsedIconOnly?: boolean;
}

export const CentriaxLogo: React.FC<CentriaxLogoProps> = ({
  className = '',
  showSubtitle = true,
  size = 'md',
  collapsedIconOnly = false,
}) => {
  const svgHeights = {
    sm: 'h-6',
    md: 'h-7',
    lg: 'h-9',
  };

  // Modo ícone compacto para menu lateral recolhido
  if (collapsedIconOnly) {
    return (
      <div
        className={`h-9 w-9 rounded-lg bg-white dark:bg-[#15263B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 shadow-sm flex items-center justify-center select-none ${className}`}
        title="Centriax - SGS"
      >
        <span className="font-extrabold text-sm tracking-tight text-[#0E1B2B] dark:text-[#E6EAED]">
          c<span className="text-[#1A73E9]">x</span>
        </span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Logo Centriax Vetorial Nativa em Alta Resolução (SVG) */}
      <div className="flex items-center shrink-0">
        <svg
          viewBox="0 0 135 30"
          className={`${svgHeights[size]} w-auto block`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Centriax"
        >
          <text
            x="0"
            y="23"
            fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontSize="26"
            fontWeight="700"
            letterSpacing="-0.6px"
          >
            <tspan className="fill-[#3D3D42] dark:fill-[#F3F4F6]">centria</tspan>
            <tspan className="fill-[#1A73E9] dark:fill-[#38BDF8]">x</tspan>
          </text>
        </svg>
      </div>

      {showSubtitle && (
        <div className="flex items-center gap-2 pl-1 border-l border-[#0E1B2B]/20 dark:border-[#E6EAED]/20">
          <div className="min-w-0 flex flex-col justify-center leading-tight">
            <span className="font-bold text-sm tracking-tight text-[#0E1B2B] dark:text-[#E6EAED]">
              SGS
            </span>
            <span className="text-[10px] font-medium text-[#0E1B2B]/70 dark:text-[#E6EAED]/70 truncate">
              Sistema de Gestão Sindical
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
