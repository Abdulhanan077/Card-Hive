"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as PieTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip } from 'recharts';

interface ClientMetricsChartsProps {
    statusData: { name: string; value: number; color: string }[];
    volumeData: { name: string; value: number }[];
}

export default function ClientMetricsCharts({ statusData, volumeData }: ClientMetricsChartsProps) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
            {/* Pie Chart for Trade Status Distribution */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Trade Status Distribution</h3>
                <div style={{ height: 300, minHeight: 300, width: '100%', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                            <Pie
                                data={statusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={120}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <PieTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                itemStyle={{ color: 'var(--text)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bar Chart for Trade Volume */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Volume by Status</h3>
                <div style={{ height: 300, minHeight: 300, width: '100%', position: 'relative' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <BarChart
                            data={statusData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="name" stroke="var(--text-muted)" />
                            <YAxis stroke="var(--text-muted)" allowDecimals={false} />
                            <BarTooltip
                                contentStyle={{ backgroundColor: 'var(--bg-alt)', borderRadius: '8px', border: '1px solid var(--border)' }}
                                cursor={{ fill: 'var(--bg-hover)' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
