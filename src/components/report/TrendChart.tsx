import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip } from '../ui/chart';
import { type TrendPoint } from '../../lib/reportUtils';

interface TrendChartProps {
  data: TrendPoint[];
}

export default function TrendChart({ data }: TrendChartProps) {
  const chartConfig = {
    vehicles: { label: 'Kendaraan', color: '#185FA5' },
    revenue: { label: 'Pendapatan', color: '#1D9E75' },
  };

  const formatXAxis = (value: string) => {
    if (value.length === 10) {
      const parts = value.split('-');
      return `${parseInt(parts[1], 10)}/${parts[2]}`;
    }
    return value;
  };

  return (
    <div className="bg-white rounded-xl border border-[#E8E8E4] p-4">
      <h3 className="text-sm font-semibold text-[#1a1a1a] mb-4">Tren Kendaraan & Pendapatan</h3>
      <ChartContainer config={chartConfig} className="h-[200px]">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E4" />
          <XAxis dataKey="date" tickFormatter={formatXAxis} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <ChartTooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="vehicles" stroke="#185FA5" strokeWidth={2} dot={{ r: 3 }} name="Kendaraan" />
          <Line type="monotone" dataKey="revenue" stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} name="Pendapatan" />
        </LineChart>
      </ChartContainer>
    </div>
  );
}