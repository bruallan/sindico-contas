import React from 'react';
import { Calendar } from 'lucide-react';

export const MONTHS_OPTIONS = [
  { value: '01', label: 'Jan' },
  { value: '02', label: 'Fev' },
  { value: '03', label: 'Mar' },
  { value: '04', label: 'Abr' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Jun' },
  { value: '07', label: 'Jul' },
  { value: '08', label: 'Ago' },
  { value: '09', label: 'Set' },
  { value: '10', label: 'Out' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dez' },
];

export interface MonthYearSelectorProps {
  label: string;
  value: string; // YYYY-MM
  years: number[];
  onChange: (nextYM: string) => void;
  className?: string;
  compact?: boolean;
}

export const MonthYearSelector: React.FC<MonthYearSelectorProps> = ({
  label,
  value,
  years,
  onChange,
  className = '',
  compact = false,
}) => {
  const [yStr, mStr] = value.split('-');

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-xs opacity-70 whitespace-nowrap font-medium">{label}</span>
      <div className={`inline-flex items-center rounded-lg bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 px-2 gap-1.5 shadow-2xs ${compact ? 'h-8 text-xs' : 'h-9 text-xs'}`}>
        <Calendar className="h-3.5 w-3.5 text-[#1A73E9] shrink-0" />
        <select
          aria-label={`${label} Mês`}
          value={mStr}
          onChange={(e) => onChange(`${yStr}-${e.target.value}`)}
          className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer pr-1 text-[#0E1B2B] dark:text-[#E6EAED]"
        >
          {MONTHS_OPTIONS.map((m) => (
            <option
              key={m.value}
              value={m.value}
              className="bg-white dark:bg-[#15263B] text-[#0E1B2B] dark:text-[#E6EAED]"
            >
              {m.label}
            </option>
          ))}
        </select>
        <span className="opacity-30 text-xs">/</span>
        <select
          aria-label={`${label} Ano`}
          value={yStr}
          onChange={(e) => onChange(`${e.target.value}-${mStr}`)}
          className="bg-transparent text-xs font-semibold tabular-nums focus:outline-none cursor-pointer text-[#0E1B2B] dark:text-[#E6EAED]"
        >
          {years.map((yr) => (
            <option
              key={yr}
              value={String(yr)}
              className="bg-white dark:bg-[#15263B] text-[#0E1B2B] dark:text-[#E6EAED]"
            >
              {yr}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
