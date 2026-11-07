import React from 'react';
import { CENTRIAX_LOGO_BASE64, CENTRIAX_LOGO_DARK_BASE64 } from '@/logoCentriax';

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
  const imgHeights = {
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
      {/* Logo Centriax nativa otimizada: versão original no Light Mode e versão branca no Dark Mode */}
      <div className="flex items-center shrink-0">
        <img
          src={CENTRIAX_LOGO_BASE64}
          alt="Centriax"
          className={`${imgHeights[size]} w-auto object-contain block dark:hidden`}
        />
        <img
          src={CENTRIAX_LOGO_DARK_BASE64}
          alt="Centriax"
          className={`${imgHeights[size]} w-auto object-contain hidden dark:block`}
        />
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
