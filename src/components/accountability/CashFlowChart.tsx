import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { MonthlyCashFlowPoint } from '@/types/database';
import { formatAxisCurrency, formatCurrencyBRL } from '@/utils/formatters';

interface CashFlowChartProps {
  data: MonthlyCashFlowPoint[];
}

// Espessura obrigatória da linha e raio exato (diâmetro = 2 * strokeWidth -> se strokeWidth=2, diâmetro=4px / r=2)
const LINE_STROKE_WIDTH = 2;
const VERTEX_RADIUS = LINE_STROKE_WIDTH; // r = 2 => diâmetro = 2 * r = 4px

interface CustomDotProps {
  cx?: number;
  cy?: number;
  index?: number;
}

const renderExactRatioVertexDot = (props: CustomDotProps): React.ReactElement<SVGElement> => {
  const { cx = 0, cy = 0, index = 0 } = props;
  return (
    <circle
      key={`vertex-${index}`}
      cx={cx}
      cy={cy}
      r={VERTEX_RADIUS}
      fill="#1A73E9"
      stroke="none"
    />
  );
};

const renderActiveVertexDot = (rawProps: unknown): React.ReactElement<SVGElement> => {
  const { cx = 0, cy = 0, index = 0 } = (rawProps ?? {}) as CustomDotProps;
  return (
    <circle
      key={`active-vertex-${index}`}
      cx={cx}
      cy={cy}
      r={VERTEX_RADIUS + 1.5}
      fill="#1A73E9"
      stroke="none"
    />
  );
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MonthlyCashFlowPoint }>;
}

const MinimalCashFlowTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg bg-white dark:bg-[#0E1B2B] border border-[#0E1B2B]/15 dark:border-[#E6EAED]/15 px-3.5 py-2.5 shadow-lg text-xs space-y-1.5 min-w-[210px]">
      <div className="font-semibold pb-1 border-b border-[#0E1B2B]/10 dark:border-[#E6EAED]/10">
        {point.label}
      </div>

      {point.incomeRealized > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="opacity-75">Entradas (Efetivado)</span>
          <span className="font-medium tabular-nums text-[#2AC38B]">
            {formatCurrencyBRL(point.incomeRealized)}
          </span>
        </div>
      )}

      {point.incomePending > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="opacity-60">Entradas (Previsto)</span>
          <span className="font-medium tabular-nums text-[#2AC38B]/65">
            {formatCurrencyBRL(point.incomePending)}
          </span>
        </div>
      )}

      {point.expenseRealizedAbs > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="opacity-75">Saídas (Efetivado)</span>
          <span className="font-medium tabular-nums text-[#EF4444]">
            -{formatCurrencyBRL(point.expenseRealizedAbs)}
          </span>
        </div>
      )}

      {point.expensePendingAbs > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="opacity-60">Saídas (Previsto)</span>
          <span className="font-medium tabular-nums text-[#EF4444]/65">
            -{formatCurrencyBRL(point.expensePendingAbs)}
          </span>
        </div>
      )}

      <div className="pt-1 border-t border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 flex items-center justify-between gap-4">
        <span className="font-medium">Saldo Mensal</span>
        <span className="font-semibold tabular-nums text-[#1A73E9]">
          {formatCurrencyBRL(point.netBalance)}
        </span>
      </div>
    </div>
  );
};

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Domínio simétrico [-max, +max] posiciona o ponto 0 exatamente como linha central de referência
  const symmetricMax = useMemo(() => {
    let peak = 1000;
    for (const d of data) {
      const posTotal = d.incomeRealized + d.incomePending;
      const negTotal = Math.abs(d.expenseRealizedNeg) + Math.abs(d.expensePendingNeg);
      const absNet = Math.abs(d.netBalance);
      peak = Math.max(peak, posTotal, negTotal, absNet);
    }
    // Margem superior/inferior de 12% arredondada
    return Math.ceil((peak * 1.12) / 1000) * 1000;
  }, [data]);

  const axisColor = isDark ? 'rgba(230, 234, 237, 0.55)' : 'rgba(14, 27, 43, 0.55)';
  const gridColor = isDark ? 'rgba(230, 234, 237, 0.07)' : 'rgba(14, 27, 43, 0.07)';
  const zeroLineColor = isDark ? 'rgba(230, 234, 237, 0.32)' : 'rgba(14, 27, 43, 0.28)';

  return (
    <section className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-5">
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            stackOffset="sign"
            margin={{ top: 14, right: 16, bottom: 6, left: 6 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: axisColor, fontSize: 11 }}
              dy={6}
            />

            <YAxis
              domain={[-symmetricMax, symmetricMax]}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatAxisCurrency}
              tick={{ fill: axisColor, fontSize: 11 }}
              width={66}
            />

            <Tooltip
              content={<MinimalCashFlowTooltip />}
              cursor={{
                fill: isDark ? 'rgba(230, 234, 237, 0.04)' : 'rgba(14, 27, 43, 0.04)',
              }}
            />

            {/* Eixo Zero Compartilhado: referência central onde as bases das entradas (+Y) e saídas (-Y) se encostam */}
            <ReferenceLine y={0} stroke={zeroLineColor} strokeWidth={1.25} />

            {/* Entradas (+Y): Efetivadas em sólido #2AC38B e Previstas/Pendentes em pastel rgba(42, 195, 139, 0.45) */}
            <Bar
              dataKey="incomeRealized"
              stackId="cashflow"
              fill="#2AC38B"
              maxBarSize={38}
              isAnimationActive={false}
            />
            <Bar
              dataKey="incomePending"
              stackId="cashflow"
              fill="rgba(42, 195, 139, 0.45)"
              maxBarSize={38}
              isAnimationActive={false}
            />

            {/* Saídas (-Y): Crescem sempre do 0 para baixo em #EF4444 e Previstas em pastel rgba(239, 68, 68, 0.45) */}
            <Bar
              dataKey="expenseRealizedNeg"
              stackId="cashflow"
              fill="#EF4444"
              maxBarSize={38}
              isAnimationActive={false}
            />
            <Bar
              dataKey="expensePendingNeg"
              stackId="cashflow"
              fill="rgba(239, 68, 68, 0.45)"
              maxBarSize={38}
              isAnimationActive={false}
            />

            {/* Linha de Saldo Mensal: segmentos estritamente retos (type="linear"), #1A73E9, diâmetro do vértice = 2x espessura */}
            <Line
              type="linear"
              dataKey="netBalance"
              stroke="#1A73E9"
              strokeWidth={LINE_STROKE_WIDTH}
              dot={renderExactRatioVertexDot}
              activeDot={renderActiveVertexDot}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
