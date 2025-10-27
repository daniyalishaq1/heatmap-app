"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
  conversions?: number;
  cost?: number;
}

interface HourlyTrendsProps {
  data: HeatmapData[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function HourlyPerformanceTrends({ data }: HourlyTrendsProps) {
  // Aggregate data by hour across all days
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourData = data.filter(d => d.hour === hour);

    const totalCost = hourData.reduce((sum, d) => sum + (d.cost || 0), 0);
    const totalConversions = hourData.reduce((sum, d) => sum + (d.conversions || 0), 0);
    const avgCost = hourData.length > 0 ? totalCost / hourData.length : 0;
    const avgConversions = hourData.length > 0 ? totalConversions / hourData.length : 0;
    // If no conversions, treat as worst case (null will be filtered out or shown differently)
    const cpa = totalConversions > 0 ? totalCost / totalConversions : null;

    return {
      hour,
      hourLabel: hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`,
      totalCost,
      totalConversions,
      avgCost,
      avgConversions,
      cpa,
      hasConversions: totalConversions > 0
    };
  });

  // Calculate daily trends
  const dailyData = DAYS.map(day => {
    const dayData = data.filter(d => d.day === day);

    const totalCost = dayData.reduce((sum, d) => sum + (d.cost || 0), 0);
    const totalConversions = dayData.reduce((sum, d) => sum + (d.conversions || 0), 0);
    // If no conversions, treat as worst case (null will be filtered out or shown differently)
    const cpa = totalConversions > 0 ? totalCost / totalConversions : null;

    return {
      day,
      dayShort: day.slice(0, 3),
      totalCost,
      totalConversions,
      cpa,
      hasConversions: totalConversions > 0
    };
  });

  // Filter out entries with no conversions for CPA charts
  const hourlyDataWithCPA = hourlyData.filter(d => d.cpa !== null);
  const dailyDataWithCPA = dailyData.filter(d => d.cpa !== null);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{name: string; value: number | null; payload: {hourLabel?: string; dayShort?: string}; color: string}> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold text-sm mb-1">{payload[0].payload.hourLabel || payload[0].payload.dayShort}</p>
          {payload.map((entry, index: number) => {
            // Handle null CPA values (when there are no conversions)
            if (entry.name.includes('CPA') && (entry.value === null || entry.value === undefined)) {
              return (
                <p key={index} className="text-xs text-red-600">
                  {entry.name}: No conversions (worst)
                </p>
              );
            }
            return (
              <p key={index} className="text-xs" style={{ color: entry.color }}>
                {entry.name}: {entry.value !== null ? (entry.name.includes('CPA') || entry.name.includes('Cost') ? `$${entry.value.toFixed(2)}` : entry.value.toFixed(2)) : 'N/A'}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Hourly Trends */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Performance by Hour of Day</h3>

        {/* Cost and Conversions by Hour */}
        <div className="mb-8">
          <h4 className="text-sm font-medium mb-3 text-gray-600">Total Cost & Conversions</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="hourLabel"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                label={{ value: 'Conversions', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalCost"
                stroke="#dc2626"
                strokeWidth={2}
                name="Total Cost"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalConversions"
                stroke="#059669"
                strokeWidth={2}
                name="Total Conversions"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CPA by Hour */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-600">Cost Per Acquisition (CPA)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyDataWithCPA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="hourLabel"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                label={{ value: 'CPA ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="cpa"
                stroke="#2563eb"
                strokeWidth={2}
                name="CPA"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 italic">
            * Hours with zero conversions are excluded from this chart
          </p>
        </div>
      </div>

      {/* Daily Trends */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Performance by Day of Week</h3>

        {/* Cost and Conversions by Day */}
        <div className="mb-8">
          <h4 className="text-sm font-medium mb-3 text-gray-600">Total Cost & Conversions</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dayShort"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                label={{ value: 'Conversions', angle: 90, position: 'insideRight', style: { fontSize: 11 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalCost"
                stroke="#dc2626"
                strokeWidth={2}
                name="Total Cost"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalConversions"
                stroke="#059669"
                strokeWidth={2}
                name="Total Conversions"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CPA by Day */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-gray-600">Cost Per Acquisition (CPA)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyDataWithCPA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dayShort"
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
                label={{ value: 'CPA ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="cpa"
                stroke="#2563eb"
                strokeWidth={2}
                name="CPA"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 italic">
            * Days with zero conversions are excluded from this chart
          </p>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Best Performing Hour</h4>
          {(() => {
            const bestHour = hourlyData.reduce((best, curr) =>
              (curr.totalConversions > best.totalConversions) ? curr : best
            );
            return (
              <div>
                <p className="text-2xl font-bold">{bestHour.hourLabel}</p>
                <p className="text-sm text-gray-500">{bestHour.totalConversions.toFixed(1)} conversions</p>
              </div>
            );
          })()}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Best Performing Day</h4>
          {(() => {
            const bestDay = dailyData.reduce((best, curr) =>
              (curr.totalConversions > best.totalConversions) ? curr : best
            );
            return (
              <div>
                <p className="text-2xl font-bold">{bestDay.day}</p>
                <p className="text-sm text-gray-500">{bestDay.totalConversions.toFixed(1)} conversions</p>
              </div>
            );
          })()}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Overall CPA</h4>
          {(() => {
            const totalCost = data.reduce((sum, d) => sum + (d.cost || 0), 0);
            const totalConversions = data.reduce((sum, d) => sum + (d.conversions || 0), 0);
            const overallCPA = totalConversions > 0 ? totalCost / totalConversions : 0;
            return (
              <div>
                <p className="text-2xl font-bold">${overallCPA.toFixed(2)}</p>
                <p className="text-sm text-gray-500">{totalConversions.toFixed(1)} total conversions</p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
