import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, FileText } from 'lucide-react';
import { Transaction } from '@/types/database';
import { formatCurrencyBRL, formatDateBR, formatYearMonthShort } from '@/utils/formatters';

interface ReceiptCompactModalProps {
  categoryName: string;
  yearMonth: string;
  transactions: Transaction[];
  onClose: () => void;
}

export const ReceiptCompactModal: React.FC<ReceiptCompactModalProps> = ({
  categoryName,
  yearMonth,
  transactions,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const current = transactions[selectedIndex] ?? transactions[0];

  if (!current) return null;

  const isPdf =
    Boolean(current.receipt_url) &&
    (current.receipt_url!.toLowerCase().includes('.pdf') ||
      current.receipt_url!.startsWith('data:application/pdf'));

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-[#0E1B2B]/60 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 p-5 shadow-2xl"
      >
        {/* Cabeçalho Compacto */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-[#1A73E9]">
              {formatYearMonthShort(yearMonth)}
            </span>
            <h3 className="text-sm font-semibold truncate mt-0.5">{categoryName}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar comprovante"
            className="h-7 w-7 rounded-lg inline-flex items-center justify-center hover:bg-[#0E1B2B]/5 dark:hover:bg-[#E6EAED]/10 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Seletor caso existam múltiplos lançamentos na mesma conta analítica e mês */}
        {transactions.length > 1 && (
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto">
            {transactions.map((tx, idx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium tabular-nums transition-colors shrink-0 ${
                  idx === selectedIndex
                    ? 'bg-[#1A73E9] text-white'
                    : 'bg-[#E6EAED]/70 dark:bg-[#0E1B2B] opacity-75 hover:opacity-100'
                }`}
              >
                #{idx + 1} · {formatCurrencyBRL(tx.amount)}
              </button>
            ))}
          </div>
        )}

        {/* Metadados da Transação */}
        <div className="py-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="opacity-60">
              {current.type === 'income' ? 'Remetente' : 'Destinatário'}
            </span>
            <span className="font-medium text-right truncate">{current.counterparty}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="opacity-60">Valor</span>
            <span
              className={`font-semibold tabular-nums ${
                current.type === 'income' ? 'text-[#2AC38B]' : 'text-[#EF4444]'
              }`}
            >
              {formatCurrencyBRL(current.amount)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="opacity-60">Status</span>
            {current.status === 'realized' ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-[#2AC38B]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2AC38B]" />
                Efetivado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium opacity-65">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1A73E9]" />
                Previsto / Pendente
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="opacity-60">Data Prevista</span>
            <span className="tabular-nums">{formatDateBR(current.due_date)}</span>
          </div>

          {current.effective_date && (
            <div className="flex items-center justify-between gap-3">
              <span className="opacity-60">Data de Efetivação</span>
              <span className="tabular-nums font-medium">{formatDateBR(current.effective_date)}</span>
            </div>
          )}
        </div>

        {/* Visualização do Comprovante Anexado */}
        <div className="pt-3 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
          {current.receipt_url ? (
            <div className="space-y-2.5">
              <div className="rounded-lg overflow-hidden border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 bg-[#E6EAED]/40 dark:bg-[#0E1B2B]">
                {isPdf ? (
                  <iframe
                    src={current.receipt_url}
                    title="Comprovante PDF"
                    className="w-full h-52"
                  />
                ) : (
                  <img
                    src={current.receipt_url}
                    alt="Comprovante da transação"
                    className="w-full max-h-56 object-contain mx-auto"
                  />
                )}
              </div>

              <div className="flex justify-end">
                <a
                  href={current.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1A73E9] hover:underline"
                >
                  <span>Abrir arquivo completo</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="h-28 rounded-lg border border-dashed border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 flex flex-col items-center justify-center gap-1.5 text-xs opacity-55">
              <FileText className="h-4 w-4" />
              <span>Sem comprovante anexado</span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
