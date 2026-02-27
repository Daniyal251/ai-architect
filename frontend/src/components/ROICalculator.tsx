import type { ROI } from '../types.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  roi: ROI;
}

export function ROICalculator({ roi }: Props) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-xl font-semibold mb-4">💰 Финансовая выгода</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-cyan-400">{roi.hours_saved}</p>
          <p className="text-sm text-gray-400">часов/месяц</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-400">{roi.cost_saved.toLocaleString()} ₽</p>
          <p className="text-sm text-gray-400">экономия/месяц</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={roi.chart_data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="month" stroke="#666" />
          <YAxis stroke="#666" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar dataKey="savings" fill="url(#gradient)" radius={[4, 4, 0, 0]} />
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
