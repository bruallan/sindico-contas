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
  LabelList,
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

interface ChartLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | string;
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

  // Série com totais calculados para suporte aos rótulos nas pontas das barras
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      totalIncome: d.incomeRealized + d.incomePending,
      totalExpenseNeg: d.expenseRealizedNeg + d.expensePendingNeg,
      totalExpenseAbs: d.expenseRealizedAbs + d.expensePendingAbs,
    }));
  }, [data]);

  // Domínio simétrico [-max, +max] posiciona o ponto 0 exatamente como linha central de referência
  const symmetricMax = useMemo(() => {
    let peak = 1000;
    for (const d of chartData) {
      const posTotal = d.totalIncome;
      const negTotal = Math.abs(d.totalExpenseNeg);
      const absNet = Math.abs(d.netBalance);
      peak = Math.max(peak, posTotal, negTotal, absNet);
    }
    // Margem superior/inferior de 20% arredondada para acomodar os rótulos nas pontas das barras e vértices
    return Math.ceil((peak * 1.2) / 1000) * 1000;
  }, [chartData]);

  const axisColor = isDark ? 'rgba(230, 234, 237, 0.55)' : 'rgba(14, 27, 43, 0.55)';
  const gridColor = isDark ? 'rgba(230, 234, 237, 0.07)' : 'rgba(14, 27, 43, 0.07)';
  const zeroLineColor = isDark ? 'rgba(230, 234, 237, 0.32)' : 'rgba(14, 27, 43, 0.28)';

  // Rótulo na ponta da barra de receitas (quando apenas realizadas existem)
  const renderIncomeRealizedLabel = (props: ChartLabelProps) => {
    const { x, y, width, index } = props;
    if (x == null || y == null || index == null) return null;
    const item = chartData[index];
    if (!item) return null;
    if (item.incomePending > 0) return null; // Se houver pendentes, a barra pendente é o topo
    if (item.incomeRealized <= 0) return null;

    const text = formatValueK(item.totalIncome);
    const cx = x + (width ?? 0) / 2;

    return (
      <text
        key={`income-realized-lbl-${index}`}
        x={cx}
        y={y - 6}
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
    );
  };

  // Rótulo na ponta da barra de receitas (quando parcelas pendentes estão no topo)
  const renderIncomePendingLabel = (props: ChartLabelProps) => {
    const { x, y, width, index } = props;
    if (x == null || y == null || index == null) return null;
    const item = chartData[index];
    if (!item) return null;
    if (item.incomePending <= 0) return null;

    const text = formatValueK(item.totalIncome);
    const cx = x + (width ?? 0) / 2;

    return (
      <text
        key={`income-pending-lbl-${index}`}
        x={cx}
        y={y - 6}
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
    );
  };

  // Rótulo na ponta da barra de saídas (quando apenas saídas realizadas existem)
  const renderExpenseRealizedLabel = (props: ChartLabelProps) => {
    const { x, y, width, height, index } = props;
    if (x == null || y == null || index == null) return null;
    const item = chartData[index];
    if (!item) return null;
    if (item.expensePendingNeg < 0) return null; // Se houver pendentes, a barra pendente é o fundo
    if (item.expenseRealizedNeg >= 0) return null;

    const text = formatValueK(item.totalExpenseNeg);
    const cx = x + (width ?? 0) / 2;
    const bottomY = y + (height ?? 0);

    return (
      <text
        key={`expense-realized-lbl-${index}`}
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
    );
  };

  // Rótulo na ponta da barra de saídas (quando parcelas pendentes estão no fundo)
  const renderExpensePendingLabel = (props: ChartLabelProps) => {
    const { x, y, width, height, index } = props;
    if (x == null || y == null || index == null) return null;
    const item = chartData[index];
    if (!item) return null;
    if (item.expensePendingNeg >= 0) return null;

    const text = formatValueK(item.totalExpenseNeg);
    const cx = x + (width ?? 0) / 2;
    const bottomY = y + (height ?? 0);

    return (
      <text
        key={`expense-pending-lbl-${index}`}
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
    );
  };

  // Rótulo nos vértices da linha de Saldo Mensal
  const renderVertexLabel = (props: ChartLabelProps) => {
    const { x, y, value, index } = props;
    if (x == null || y == null || index == null) return null;
    const item = chartData[index];
    const numVal = Number(value ?? item?.netBalance ?? 0);
    const text = formatValueK(numVal, true);

    // Evitar sobreposição com o topo da barra de receitas ou fundo da barra de despesas
    let offsetY = numVal < 0 ? 14 : -8;
    if (item) {
      if (numVal > 0 && item.totalIncome - numVal < 15000) {
        // Vértice muito próximo do topo da barra: posiciona logo abaixo do ponto
        offsetY = 14;
      } else if (numVal < 0 && Math.abs(item.totalExpenseNeg) - Math.abs(numVal) < 15000) {
        // Vértice muito próximo do fundo da barra: posiciona logo acima do ponto
        offsetY = -8;
      }
    }

    return (
      <text
        key={`vertex-lbl-${index}`}
        x={x}
        y={y + offsetY}
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
        {text}
      </text>
    );
  };

  return (
    <section className="rounded-xl bg-white dark:bg-[#15263B] border border-[#0E1B2B]/10 dark:border-[#E6EAED]/10 p-5">
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            stackOffset="sign"
            margin={{ top: 22, right: 16, bottom: 20, left: 6 }}
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
            >
              <LabelList
                dataKey="incomeRealized"
                content={renderIncomeRealizedLabel}
              />
            </Bar>
            <Bar
              dataKey="incomePending"
              stackId="cashflow"
              fill="rgba(42, 195, 139, 0.45)"
              maxBarSize={38}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="incomePending"
                content={renderIncomePendingLabel}
              />
            </Bar>

            {/* Saídas (-Y): Crescem sempre do 0 para baixo em #EF4444 e Previstas em pastel rgba(239, 68, 68, 0.45) */}
            <Bar
              dataKey="expenseRealizedNeg"
              stackId="cashflow"
              fill="#EF4444"
              maxBarSize={38}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="expenseRealizedNeg"
                content={renderExpenseRealizedLabel}
              />
            </Bar>
            <Bar
              dataKey="expensePendingNeg"
              stackId="cashflow"
              fill="rgba(239, 68, 68, 0.45)"
              maxBarSize={38}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="expensePendingNeg"
                content={renderExpensePendingLabel}
              />
            </Bar>

            {/* Linha de Saldo Mensal: segmentos estritamente retos (type="linear"), #1A73E9, diâmetro do vértice = 2x espessura */}
            <Line
              type="linear"
              dataKey="netBalance"
              stroke="#1A73E9"
              strokeWidth={LINE_STROKE_WIDTH}
              dot={renderExactRatioVertexDot}
              activeDot={renderActiveVertexDot}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="netBalance"
                content={renderVertexLabel}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
};
