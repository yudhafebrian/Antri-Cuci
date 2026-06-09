import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip } from '../ui/chart';
import { type PaketBreakdown } from '../../lib/reportUtils';

interface PaketBarChartProps {
  data: PaketBreakdown[];
  title: string;
  valueKey: 'count' | 'revenue';
}

export default function PaketBarChart({ data, title, valueKey }: PaketBarChartProps) {
  const sortedData = [...data].sort((a, b) => {
    if (valueKey === 'revenue') {
      return b.revenue - a.revenue;
    }
    return b.count - a.count;
  });

  const chartConfig = {
    value: { label: title, color: '#185FA5' },
  };

  const formatValue = (value: number) => {
    if (valueKey === 'revenue') {
      return `Rp${(value / 1000).toFixed(0)}rb`;
    }
    return value.toString();
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">{title}</h3>
      <ChartContainer config={chartConfig} className="h-[200px]">
        <BarChart data={sortedData} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={formatValue} />
          <YAxis type="category" dataKey="paket" tick={{ fontSize: 10 }} width={75} />
          <ChartTooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey={valueKey} fill="#185FA5" barSize={24} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}