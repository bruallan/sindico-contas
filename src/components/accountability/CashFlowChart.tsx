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
  value?: number;
  payload?: MonthlyCashFlowPoint;
}

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  value?: number;
  payload?: MonthlyCashFlowPoint;
  index?: number;
}

/**
 * Formata valores numéricos para o formato abreviado com k (ex: R$ 169k, -R$ 27k)
 */
const formatValueK = (val: number, isVertex = false): string => {
  if (val === 0) return isVertex ? 'R$ 0' : '';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${Math.round(abs / 1_000).toLocaleString('pt-BR')}k`;
  }
  return `${sign}R$ ${Math.round(abs).toLocaleString('pt-BR')}`;
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
    // Margem superior/inferior de 18% arredondada para dar respiro aos rótulos nas pontas
    return Math.ceil((peak * 1.18) / 1000) * 1000;
  }, [data]);

  const axisColor = isDark ? 'rgba(230, 234, 237, 0.55)' : 'rgba(14, 27, 43, 0.55)';
  const gridColor = isDark ? 'rgba(230, 234, 237, 0.07)' : 'rgba(14, 27, 43, 0.07)';
  const zeroLineColor = isDark ? 'rgba(230, 234, 237, 0.32)' : 'rgba(14, 27, 43, 0.28)';

  // Barra de receitas realizadas (+Y sólido) com rótulo
  const renderIncomeRealizedBar = (rawProps: unknown): React.ReactElement<SVGElement> => {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload, index = 0 } =
      ((rawProps ?? {}) as BarShapeProps);
    const rectHeight = Math.abs(height);
    if (!width || rectHeight <= 0) return <g />;

    const realized = Number(payload?.incomeRealized ?? 0);
    const pending = Number(payload?.incomePending ?? 0);
    if (realized <= 0) return <g />;

    const topY = Math.min(y, y + height);
    const cx = x + width / 2;
    const text = formatValueK(realized);

    return (
      <g key={`bar-in-realized-${index}`}>
        <rect x={x} y={topY} width={width} height={rectHeight} fill={fill} />
        {text && (
          <text
            x={cx}
            y={pending > 0 ? topY + 11 : topY - 6}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="#2AC38B"
            stroke={isDark ? '#15263B' : '#FFFFFF'}
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke fill"
            className="select-none pointer-events-none"
          >
            {text}
          </text>
        )}
      </g>
    );
  };

  // Barra de receitas pendentes (+Y pastel empilhado) com rótulo no topo total
  const renderIncomePendingBar = (rawProps: unknown): React.ReactElement<SVGElement> => {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload, index = 0 } =
      ((rawProps ?? {}) as BarShapeProps);
    const rectHeight = Math.abs(height);
    if (!width || rectHeight <= 0) return <g />;

    const realized = Number(payload?.incomeRealized ?? 0);
    const pending = Number(payload?.incomePending ?? 0);
    if (pending <= 0) return <g />;

    const topY = Math.min(y, y + height);
    const cx = x + width / 2;
    const total = realized + pending;
    const text = formatValueK(total);

    return (
      <g key={`bar-in-pending-${index}`}>
        <rect x={x} y={topY} width={width} height={rectHeight} fill={fill} />
        {text && (
          <text
            x={cx}
            y={topY - 6}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="#2AC38B"
            stroke={isDark ? '#15263B' : '#FFFFFF'}
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke fill"
            className="select-none pointer-events-none"
          >
            {text}
          </text>
        )}
      </g>
    );
  };

  // Barra de saídas realizadas (-Y sólido) com rótulo
  const renderExpenseRealizedBar = (rawProps: unknown): React.ReactElement<SVGElement> => {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload, index = 0 } =
      ((rawProps ?? {}) as BarShapeProps);
    const rectHeight = Math.abs(height);
    if (!width || rectHeight <= 0) return <g />;

    const realizedNeg = Number(payload?.expenseRealizedNeg ?? 0);
    const pendingNeg = Number(payload?.expensePendingNeg ?? 0);
    if (realizedNeg >= 0) return <g />;

    const topY = Math.min(y, y + height);
    const bottomY = Math.max(y, y + height);
    const cx = x + width / 2;
    const text = formatValueK(realizedNeg);

    return (
      <g key={`bar-out-realized-${index}`}>
        <rect x={x} y={topY} width={width} height={rectHeight} fill={fill} />
        {text && (
          <text
            x={cx}
            y={pendingNeg < 0 ? bottomY - 3 : bottomY + 13}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="#EF4444"
            stroke={isDark ? '#15263B' : '#FFFFFF'}
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke fill"
            className="select-none pointer-events-none"
          >
            {text}
          </text>
        )}
      </g>
    );
  };

  // Barra de saídas pendentes (-Y pastel empilhado) com rótulo no fundo total
  const renderExpensePendingBar = (rawProps: unknown): React.ReactElement<SVGElement> => {
    const { x = 0, y = 0, width = 0, height = 0, fill, payload, index = 0 } =
      ((rawProps ?? {}) as BarShapeProps);
    const rectHeight = Math.abs(height);
    if (!width || rectHeight <= 0) return <g />;

    const realizedNeg = Number(payload?.expenseRealizedNeg ?? 0);
    const pendingNeg = Number(payload?.expensePendingNeg ?? 0);
    if (pendingNeg >= 0) return <g />;

    const topY = Math.min(y, y + height);
    const bottomY = Math.max(y, y + height);
    const cx = x + width / 2;
    const totalNeg = realizedNeg + pendingNeg;
    const text = formatValueK(totalNeg);

    return (
      <g key={`bar-out-pending-${index}`}>
        <rect x={x} y={topY} width={width} height={rectHeight} fill={fill} />
        {text && (
          <text
            x={cx}
            y={bottomY + 13}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="#EF4444"
            stroke={isDark ? '#15263B' : '#FFFFFF'}
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke fill"
            className="select-none pointer-events-none"
          >
            {text}
          </text>
        )}
      </g>
    );
  };

  // Vértice da linha de Saldo Mensal com o valor correspondente
  const renderExactRatioVertexDot = (props: CustomDotProps): React.ReactElement<SVGElement> => {
    const { cx = 0, cy = 0, index = 0, value, payload } = props ?? {};
    const numVal = Number(value ?? payload?.netBalance ?? 0);
    const totalIn = Number(payload?.incomeRealized ?? 0) + Number(payload?.incomePending ?? 0);
    const totalOut = Number(payload?.expenseRealizedAbs ?? 0) + Number(payload?.expensePendingAbs ?? 0);
    const hasActivity = totalIn > 0 || totalOut > 0 || numVal !== 0;

    return (
      <g key={`vertex-${index}`}>
        <circle
          cx={cx}
          cy={cy}
          r={VERTEX_RADIUS}
          fill="#1A73E9"
          stroke="none"
        />
        {hasActivity && (
          <text
            x={cx}
            y={cy - 9}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fill="#1A73E9"
            stroke={isDark ? '#15263B' : '#FFFFFF'}
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke fill"
            className="select-none pointer-events-none"
          >
            {formatValueK(numVal, true)}
          </text>
        )}
      </g>
    );
  };

  // Vértice ativo no hover
  const renderActiveVertexDot = (rawProps: unknown): React.ReactElement<SVGElement> => {
    const { cx = 0, cy = 0, index = 0, value, payload } = (rawProps ?? {}) as CustomDotProps;
    const numVal = Number(value ?? payload?.netBalance ?? 0);
    const totalIn = Number(payload?.incomeRealized ?? 0) + Number(payload?.incomePending ?? 0);
    const totalOut = Number(payload?.expenseRealizedAbs ?? 0) + Number(payload?.expensePendingAbs ?? 0);
    const hasActivity = totalIn > 0 || totalOut > 0 || numVal !== 0;

    return (
      <g key={`active-vertex-${index}`}>
        <circle
          cx={cx}
          cy={cy}
          r={VERTEX_RADIUS + 1.5}
          fill="#1A73E9"
          stroke="none"
        />
        {hasActivity && (
          <text
            x={cx}
            y={cy - 9}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="#1A73E9"
            stroke={isDark ? '#15263B' : '#FFFFFF'}
            strokeWidth={3}
            strokeLinejoin="round"
            paintOrder="stroke fill"
            className="select-none pointer-events-none"
          >
            {formatValueK(numVal, true)}
          </text>
        )}
      </g>
    );
  };

  return (
    <section className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-5">
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            stackOffset="sign"
            margin={{ top: 20, right: 16, bottom: 20, left: 6 }}
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
              shape={renderIncomeRealizedBar}
            />
            <Bar
              dataKey="incomePending"
              stackId="cashflow"
              fill="rgba(42, 195, 139, 0.45)"
              maxBarSize={38}
              isAnimationActive={false}
              shape={renderIncomePendingBar}
            />

            {/* Saídas (-Y): Crescem sempre do 0 para baixo em #EF4444 e Previstas em pastel rgba(239, 68, 68, 0.45) */}
            <Bar
              dataKey="expenseRealizedNeg"
              stackId="cashflow"
              fill="#EF4444"
              maxBarSize={38}
              isAnimationActive={false}
              shape={renderExpenseRealizedBar}
            />
            <Bar
              dataKey="expensePendingNeg"
              stackId="cashflow"
              fill="rgba(239, 68, 68, 0.45)"
              maxBarSize={38}
              isAnimationActive={false}
              shape={renderExpensePendingBar}
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
