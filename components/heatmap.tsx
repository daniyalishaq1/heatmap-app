"use client";

import React, { useState } from 'react';

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
}

interface HeatmapProps {
  data: HeatmapData[];
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Heatmap({ data }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number; value: number } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Find max value for color scaling
  const maxValue = Math.max(...data.map(d => d.value), 1);

  // Create a map for quick lookup
  const dataMap = new Map<string, number>();
  data.forEach(d => {
    const key = `${d.day}-${d.hour}`;
    dataMap.set(key, d.value);
  });

  // Get color based on value with 5 shades
  const getColor = (value: number) => {
    if (value === 0) return 'rgb(255, 255, 255)'; // white for zero
    const intensity = Math.min(value / maxValue, 1);

    // 4 shades of purple (light to dark)
    if (intensity <= 0.25) return 'rgb(196, 181, 253)'; // light purple
    if (intensity <= 0.5) return 'rgb(147, 129, 255)'; // medium purple
    if (intensity <= 0.75) return 'rgb(109, 78, 239)'; // dark purple
    return 'rgb(67, 46, 180)'; // darkest purple
  };

  // Get display value
  const getValue = (day: string, hour: number): number => {
    return dataMap.get(`${day}-${hour}`) || 0;
  };

  // Get all times with zero conversions
  const getZeroConversionTimes = () => {
    const zeroTimes: { day: string; hour: number }[] = [];

    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        const value = getValue(day, hour);
        if (value === 0) {
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
                      const value = getValue(day, hour);
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className="w-full h-[26px] border-r border-b border-gray-200 transition-all hover:opacity-80 cursor-pointer flex items-center justify-center font-medium relative text-[10px]"
                          style={{
                            backgroundColor: getColor(value),
                            color: value > maxValue * 0.5 ? 'white' : 'rgb(31, 41, 55)'
                          }}
                          onMouseEnter={(e) => {
                            setHoveredCell({ day, hour, value });
                            setMousePosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseMove={(e) => {
                            setMousePosition({ x: e.clientX, y: e.clientY });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {value > 0 ? (
                            value.toFixed(0)
                          ) : (
                            <div
                              className="w-0.5 h-0.5 rounded-full"
                              style={{ backgroundColor: value > maxValue * 0.5 ? 'white' : 'rgb(31, 41, 55)' }}
                            />
                          )}
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
        <span className="text-muted-foreground font-medium">Less</span>
        <div className="flex gap-1">
          <div className="w-6 h-6 rounded border border-gray-300" style={{ backgroundColor: 'rgb(255, 255, 255)' }} title="0 conversions" />
          <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(196, 181, 253)' }} title="Low" />
          <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(147, 129, 255)' }} title="Medium" />
          <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(109, 78, 239)' }} title="High" />
          <div className="w-6 h-6 rounded" style={{ backgroundColor: 'rgb(67, 46, 180)' }} title="Highest" />
        </div>
        <span className="text-muted-foreground font-medium">More</span>
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
          {hoveredCell.day} {formatTime(hoveredCell.hour)} - {hoveredCell.value.toFixed(2)} conversions
        </div>
      )}

      {/* Zero Conversions List */}
      {zeroConversionTimes.length > 0 && (
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
