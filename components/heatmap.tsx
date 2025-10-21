"use client";

import React, { useState } from 'react';

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
  conversions?: number;
  cost?: number;
}

interface HeatmapProps {
  data: HeatmapData[];
  metricType?: 'conversions' | 'cost' | 'conversion-cost' | 'cost-conversion';
  title?: string;
  hideZeroList?: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Heatmap({ data, metricType = 'conversions', title, hideZeroList = false }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number; value: number; conversions?: number; cost?: number } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Find min and max values for color scaling
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const minValue = Math.min(...data.map(d => d.value), 0);

  // Create a map for quick lookup
  const dataMap = new Map<string, HeatmapData>();
  data.forEach(d => {
    const key = `${d.day}-${d.hour}`;
    dataMap.set(key, d);
  });

  // Helper function to interpolate between two hex colors
  const interpolateColor = (color1: string, color2: string, factor: number) => {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Get color based on value using smooth gradient
  const getColor = (value: number) => {
    // Special handling for cost/conversion: zero is the worst (dark red/highest)
    if (metricType === 'cost-conversion' && value === 0) {
      return '#b91c1c'; // Dark red for zero (worst case)
    }

    const intensity = Math.min(value / maxValue, 1);

    if (metricType === 'conversions') {
      // Conversion: white (lowest) to green (highest)
      return interpolateColor('#ffffff', '#2da155', intensity);
    } else if (metricType === 'cost') {
      // Cost: white (lowest) to red (highest)
      return interpolateColor('#ffffff', '#fe7f7f', intensity);
    } else if (metricType === 'conversion-cost') {
      // Conversion/Cost: white (lowest) to green (highest)
      return interpolateColor('#ffffff', '#2da155', intensity);
    } else if (metricType === 'cost-conversion') {
      // Cost/Conversion: white (lowest) to red (highest)
      return interpolateColor('#ffffff', '#fe7f7f', intensity);
    }

    // Fallback
    return interpolateColor('#ffffff', '#2da155', intensity);
  };

  // Get text color based on background brightness
  const getTextColor = (value: number) => {
    const bgColor = getColor(value);

    // Calculate brightness from hex color
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);

    // Use relative luminance formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // If brightness is above threshold, use black text, otherwise white
    return brightness > 155 ? '#000000' : '#ffffff';
  };

  // Get cell data
  const getCellData = (day: string, hour: number): HeatmapData => {
    const data = dataMap.get(`${day}-${hour}`);
    return data || { hour, day, value: 0, conversions: 0, cost: 0 };
  };

  // Get all times with zero conversions
  const getZeroConversionTimes = () => {
    const zeroTimes: { day: string; hour: number }[] = [];

    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        const cellData = getCellData(day, hour);
        if (cellData.value === 0) {
          zeroTimes.push({ day, hour });
        }
      });
    });

    return zeroTimes;
  };

  const zeroConversionTimes = getZeroConversionTimes();

  // Format time for display
  const formatTime = (hour: number) => {
    return hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  };

  return (
    <div className="w-full">
      <div className="flex gap-2">
        {/* Time labels column - outside container */}
        <div className="flex flex-col text-[10px] pt-[28px]">
          {HOURS.map(hour => (
            <div key={hour} className="h-[26px] font-medium text-right text-muted-foreground leading-tight flex items-center justify-end pr-1">
              {hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`}
            </div>
          ))}
        </div>

        {/* Main heatmap container */}
        <div className="flex-1">
          {/* Day names row - outside container */}
          <div className="grid grid-cols-7 gap-0 text-[10px] mb-0.5">
            {DAYS.map(day => (
              <div key={day} className="font-medium text-center py-1 text-muted-foreground">
                {day.slice(0, 3)}
              </div>
            ))}
          </div>

          {/* Bordered container with cells */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-0 min-w-max">
                {/* Heatmap cells only */}
                {HOURS.map(hour => (
                  <React.Fragment key={hour}>
                    {DAYS.map(day => {
                      const cellData = getCellData(day, hour);
                      const value = cellData.value;
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="w-full h-[26px] border-r border-b border-gray-200 transition-all hover:opacity-80 cursor-pointer flex items-center justify-center font-medium relative text-[10px]"
                          style={{
                            backgroundColor: getColor(value),
                            color: getTextColor(value)
                          }}
                          onMouseEnter={(e) => {
                            setHoveredCell({
                              day,
                              hour,
                              value,
                              conversions: cellData.conversions,
                              cost: cellData.cost
                            });
                            setMousePosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => {
                            setMousePosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {value === 0
                            ? 0
                            : (metricType === 'conversion-cost' || metricType === 'cost-conversion'
                              ? value.toFixed(2)
                              : value)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-4 text-xs">
        <span className="text-muted-foreground font-medium">
          Low ({metricType === 'conversion-cost' || metricType === 'cost-conversion' ? minValue.toFixed(2) : Math.round(minValue)})
        </span>
        <div className="flex gap-1">
          <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: '#ffffff' }} title="Low" />
          <div className="w-6 h-6 rounded" style={{
            backgroundColor: metricType === 'conversions' || metricType === 'conversion-cost'
              ? interpolateColor('#ffffff', '#2da155', 0.5)
              : interpolateColor('#ffffff', '#fe7f7f', 0.5)
          }} title="Medium" />
          <div className="w-6 h-6 rounded" style={{
            backgroundColor: metricType === 'conversions' || metricType === 'conversion-cost'
              ? '#2da155'
              : '#fe7f7f'
          }} title="High" />
        </div>
        <span className="text-muted-foreground font-medium">
          High ({metricType === 'conversion-cost' || metricType === 'cost-conversion' ? maxValue.toFixed(2) : Math.round(maxValue)})
        </span>
      </div>

      {/* Custom Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y + 10}px`,
          }}
        >
          {hoveredCell.day} {formatTime(hoveredCell.hour)} - {
            metricType === 'conversions'
              ? `Cost: ${hoveredCell.cost?.toFixed(2) || 0}`
              : metricType === 'cost'
              ? `Conversions: ${hoveredCell.conversions || 0}`
              : metricType === 'conversion-cost'
              ? `Conversions: ${hoveredCell.conversions || 0}, Cost: ${hoveredCell.cost?.toFixed(2) || 0}`
              : `Conversions: ${hoveredCell.conversions || 0}, Cost: ${hoveredCell.cost?.toFixed(2) || 0}`
          }
        </div>
      )}

      {/* Zero Conversions List */}
      {!hideZeroList && zeroConversionTimes.length > 0 && (
        <div className="mt-6 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">Times with Zero Conversions ({zeroConversionTimes.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {zeroConversionTimes.map(({ day, hour }) => (
              <div
                key={`${day}-${hour}`}
                className="text-xs text-muted-foreground bg-gray-50 rounded px-2 py-1.5 border border-gray-200"
              >
                <span className="font-medium">{day.slice(0, 3)}</span> {formatTime(hour)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
