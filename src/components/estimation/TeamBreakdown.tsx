import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { RoleEstimate } from '@/types/projectAnalysis';
import { totalCost, totalHours } from '@/data/demoAnalysis';

interface TeamBreakdownProps {
  team: RoleEstimate[];
}

const BAR_COLORS = ['#f97316', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#eab308', '#06b6d4'];

const TeamBreakdown = ({ team }: TeamBreakdownProps) => {
  const hours = totalHours(team);
  const cost = totalCost(team);
  const chartData = team.map((r) => ({ name: r.role.replace(' Developer', ' Dev'), cost: r.hours * r.hourlyRate }));

  return (
    <div>
      {/* Rate table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm">
          <caption className="sr-only">Recommended team with hours and hourly rates</caption>
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500">
              <th scope="col" className="py-2 pr-3 font-medium">Role</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Hours</th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">Rate/hr</th>
              <th scope="col" className="py-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {team.map((r) => (
              <tr key={r.role} className="border-b border-gray-200 text-gray-700">
                <td className="py-2.5 pr-3">{r.role}</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">{r.hours} h</td>
                <td className="py-2.5 pr-3 text-right tabular-nums">${r.hourlyRate}</td>
                <td className="py-2.5 text-right font-medium tabular-nums text-gray-900">
                  ${(r.hours * r.hourlyRate).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="text-gray-900">
              <th scope="row" className="py-3 pr-3 text-left font-semibold">Total</th>
              <td className="py-3 pr-3 text-right font-semibold tabular-nums">{hours} h</td>
              <td className="py-3 pr-3" />
              <td className="py-3 text-right text-base font-bold tabular-nums text-pink-600">
                ${cost.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Cost chart */}
      <div className="mt-6 h-56" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={52}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickFormatter={(v: number) => `$${v}`}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: 'rgba(236,72,153,0.06)' }}
              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Estimated cost']}
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                color: '#111827',
              }}
            />
            <Bar dataKey="cost" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TeamBreakdown;
