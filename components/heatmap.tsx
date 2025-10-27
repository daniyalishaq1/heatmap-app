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
  metricType?: 'conversions' | 'cost' | 'conversion-cost' | 'cost-conversion' | 'quintiles';
  title?: string;
  hideZeroList?: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Calendar View Component
interface CalendarViewProps {
  data: HeatmapData[];
  quintileData: {
    quintiles: Array<Array<{
      day: string;
      hour: number;
      cost: number;
      conversions: number;
      costPerConversion: number;
    }>>;
    quintileMap: Map<string, number>;
    totalSpend: number;
    quintileSpend: number;
  };
  blockSize: '1hour' | '4hour';
  blockGrouping: '4-8-12' | '11-3-7' | '10-2-6' | '7-11-3';
  fourHourQuintileData?: Array<Array<{
    day: string;
    blockLabel: string;
    hourRange: string;
    hours: number[];
    cost: number;
    conversions: number;
    costPerConversion: number;
  }>> | null;
}

function CalendarView({ data, quintileData, blockSize, blockGrouping, fourHourQuintileData }: CalendarViewProps) {
  const [selectedQuintiles, setSelectedQuintiles] = useState<Set<number>>(new Set());

  // Get the hour blocks based on the selected grouping
  const getBlockStarts = (grouping: '4-8-12' | '11-3-7' | '10-2-6' | '7-11-3') => {
    switch (grouping) {
      case '4-8-12':
        return [4, 8, 12, 16, 20, 0]; // 4am-8am, 8am-12pm, 12pm-4pm, 4pm-8pm, 8pm-12am, 12am-4am
      case '11-3-7':
        return [11, 15, 19, 23, 3, 7]; // 11am-3pm, 3pm-7pm, 7pm-11pm, 11pm-3am, 3am-7am, 7am-11am
      case '10-2-6':
        return [10, 14, 18, 22, 2, 6]; // 10am-2pm, 2pm-6pm, 6pm-10pm, 10pm-2am, 2am-6am, 6am-10am
      case '7-11-3':
        return [7, 11, 15, 19, 23, 3]; // 7am-11am, 11am-3pm, 3pm-7pm, 7pm-11pm, 11pm-3am, 3am-7am
    }
  };

  const blockStarts = getBlockStarts(blockGrouping);

  const getQuintileColor = (quintileIndex: number) => {
    const colors = [
      '#7f1d1d', // bg-red-900 - Group 0 (Zero Conversions)
      '#f87171', // bg-red-400 - Group 1 (Worst Quartile)
      '#fde047', // bg-yellow-300 - Group 2 (2nd Quartile)
      '#4ade80', // bg-green-400 - Group 3 (3rd Quartile)
      '#14532d'  // bg-green-900 - Group 4 (Best Quartile)
    ];
    return colors[quintileIndex] || '#ffffff';
  };

  // Get text color based on quintile
  const getTextColor = (quintileIndex: number) => {
    return quintileIndex === 2 ? '#000000' : '#ffffff';
  };

  // Format time for display
  const formatTime = (hour: number) => {
    return hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  };

  // Format time range for 4-hour blocks
  const formatBlockTime = (start: number, end: number) => {
    const formatHour = (h: number) => {
      const hour = h % 24; // Handle wraparound
      if (hour === 0) return '12am';
      if (hour < 12) return `${hour}am`;
      if (hour === 12) return '12pm';
      return `${hour - 12}pm`;
    };
    return `${formatHour(start)}-${formatHour(end + 1)}`;
  };

  // Get cell data for a specific day and hour
  const getCellData = (day: string, hour: number) => {
    const cellData = data.find(d => d.day === day && d.hour === hour);
    return cellData || { hour, day, value: 0, conversions: 0, cost: 0 };
  };

  // Get aggregated data for 4-hour blocks
  const getBlockData = (day: string, blockStart: number) => {
    const blockEnd = blockStart + 3;
    const blockHours = [];
    for (let h = blockStart; h <= blockEnd; h++) {
      blockHours.push(h);
    }

    // Use the merged 4-hour quintile data structure
    // Each block appears only once in the quintile data
    if (fourHourQuintileData) {
      // Find this block in the merged quintile data (it will only exist in one quintile)
      for (const quintileBlocks of fourHourQuintileData) {
        const block = quintileBlocks.find(
          b => b.day === day && b.hourRange === `${blockStart}-${blockEnd}`
        );
        if (block) {
          return {
            day,
            blockStart,
            cost: block.cost,
            conversions: block.conversions,
            hours: blockHours
          };
        }
      }
    }

    // Block not found in quintile data (shouldn't happen)
    return {
      day,
      blockStart,
      cost: 0,
      conversions: 0,
      hours: blockHours
    };
  };

  // Get quintile index for 4-hour block based on aggregated block performance
  const getBlockQuintileIndex = (day: string, blockStart: number) => {
    const blockEnd = blockStart + 3;

    // Find which quintile contains this block
    // Each block only appears in one quintile
    if (fourHourQuintileData) {
      for (let quintileIndex = 0; quintileIndex < fourHourQuintileData.length; quintileIndex++) {
        const found = fourHourQuintileData[quintileIndex].find(
          block => block.day === day && block.hourRange === `${blockStart}-${blockEnd}`
        );
        if (found) {
          return quintileIndex;
        }
      }
    }

    return undefined;
  };

  // Check if cell should be visible based on filter
  const isCellVisible = (quintileIndex: number | undefined) => {
    if (selectedQuintiles.size === 0) return true;
    if (quintileIndex === undefined) return false;
    return selectedQuintiles.has(quintileIndex);
  };

  // Toggle quintile selection
  const toggleQuintile = (index: number) => {
    const newSelected = new Set(selectedQuintiles);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedQuintiles(newSelected);
  };

  // Clear all selections
  const clearSelection = () => {
    setSelectedQuintiles(new Set());
  };

  // Group filter options - colors match Group blocks
  const quintileFilters = [
    { index: 0, label: 'Group 0 (Zero Conv)', color: '#7f1d1d' },
    { index: 1, label: 'Group 1 (Worst)', color: '#f87171' },
    { index: 2, label: 'Group 2', color: '#fde047' },
    { index: 3, label: 'Group 3', color: '#4ade80' },
    { index: 4, label: 'Group 4 (Best)', color: '#14532d' }
  ];

  return (
    <div className="mt-6 border border-gray-200 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">Calendar Heatmap View</h3>
        <p className="text-xs text-gray-500 mt-1">
          Performance by day and 4-hour block
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-600">Filter:</span>
        <button
          onClick={clearSelection}
          className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
            selectedQuintiles.size === 0
              ? 'bg-white text-gray-900 font-semibold shadow-md border border-gray-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
          }`}
        >
          All
        </button>
        {quintileFilters.map((filter) => (
          <button
            key={filter.index}
            onClick={() => toggleQuintile(filter.index)}
            className={`px-4 py-2 text-sm rounded-lg transition-all flex items-center gap-2 ${
              selectedQuintiles.has(filter.index)
                ? 'bg-white text-gray-900 font-semibold shadow-md border border-gray-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: filter.color }}
            />
            {filter.label}
          </button>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="flex gap-0">
        {/* Time labels column */}
        <div className="flex flex-col text-[10px] pt-[40px]">
          {blockStarts.map(blockStart => (
              <div key={blockStart} className="h-[46px] font-medium text-right text-muted-foreground flex items-center justify-end pr-3" style={{ marginBottom: '2px' }}>
                {formatBlockTime(blockStart, blockStart + 3)}
              </div>
            ))}
        </div>

        {/* Main grid container */}
        <div className="flex-1 overflow-x-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0.5 mb-0.5 bg-gray-100 p-1 rounded-t">
            {DAYS.map(day => (
              <div key={day} className="text-center font-semibold text-[11px] py-2 text-gray-700 bg-white rounded">
                {day}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="grid grid-cols-7 gap-0.5 bg-gray-200 p-0.5">
            {blockStarts.map(blockStart => (
                DAYS.map(day => {
                  const blockData = getBlockData(day, blockStart);
                  const quintileIndex = getBlockQuintileIndex(day, blockStart);
                  const isVisible = isCellVisible(quintileIndex);
                  const bgColor = quintileIndex !== undefined ? getQuintileColor(quintileIndex) : '#ffffff';
                  const textColor = quintileIndex !== undefined ? getTextColor(quintileIndex) : '#374151';

                  return (
                    <div
                      key={`${day}-${blockStart}`}
                      className={`h-[46px] flex flex-col justify-center transition-all ${
                        isVisible ? 'hover:opacity-80 cursor-pointer' : 'opacity-20'
                      }`}
                      style={{ backgroundColor: bgColor }}
                    >
                      {blockData.cost && blockData.cost > 0 && isVisible ? (
                        <div style={{ color: textColor }} className="text-center px-1">
                          <div className="text-[10px] font-bold leading-tight">
                            ${blockData.cost.toFixed(2)}
                          </div>
                          {blockData.conversions !== undefined && blockData.conversions > 0 && (
                            <>
                              <div className="text-[8px] leading-tight">
                                ↗ Conv: {blockData.conversions.toFixed(1)}
                              </div>
                              <div className="text-[8px] font-semibold leading-tight">
                                CPA: ${(blockData.cost / blockData.conversions).toFixed(2)}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-center text-gray-300 text-[10px]">-</div>
                      )}
                    </div>
                  );
                })
              ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#7f1d1d' }} />
          <span className="text-xs text-gray-600">Group 0 (Zero Conv)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f87171' }} />
          <span className="text-xs text-gray-600">Group 1 (Worst)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: '#fde047' }} />
          <span className="text-xs text-gray-600">Group 2</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#4ade80' }} />
          <span className="text-xs text-gray-600">Group 3</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#14532d' }} />
          <span className="text-xs text-gray-600">Group 4 (Best)</span>
        </div>
      </div>

      <div className="mt-2 text-center text-xs text-gray-500">
        Colors based on performance groups - Group 0: Zero conversions, Groups 1-4: Quartiles by CPA
      </div>
    </div>
  );
}

export function Heatmap({ data, metricType = 'conversions', hideZeroList = false }: HeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ day: string; hour: number; value: number; conversions?: number; cost?: number } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [quintileBlockSize, setQuintileBlockSize] = useState<'1hour' | '4hour'>('1hour');
  const [blockGrouping, setBlockGrouping] = useState<'4-8-12' | '11-3-7' | '10-2-6' | '7-11-3'>('4-8-12');

  // Get the hour blocks based on the selected grouping
  const getBlockStarts = (grouping: '4-8-12' | '11-3-7' | '10-2-6' | '7-11-3') => {
    switch (grouping) {
      case '4-8-12':
        return [4, 8, 12, 16, 20, 0]; // 4am-8am, 8am-12pm, 12pm-4pm, 4pm-8pm, 8pm-12am, 12am-4am
      case '11-3-7':
        return [11, 15, 19, 23, 3, 7]; // 11am-3pm, 3pm-7pm, 7pm-11pm, 11pm-3am, 3am-7am, 7am-11am
      case '10-2-6':
        return [10, 14, 18, 22, 2, 6]; // 10am-2pm, 2pm-6pm, 6pm-10pm, 10pm-2am, 2am-6am, 6am-10am
      case '7-11-3':
        return [7, 11, 15, 19, 23, 3]; // 7am-11am, 11am-3pm, 3pm-7pm, 7pm-11pm, 11pm-3am, 3am-7am
    }
  };

  // Check if an hour belongs to the current block grouping
  const isHourInBlockGrouping = (hour: number, grouping: '4-8-12' | '11-3-7' | '10-2-6' | '7-11-3') => {
    const blockStarts = getBlockStarts(grouping);
    for (const start of blockStarts) {
      const hours = [];
      for (let i = 0; i < 4; i++) {
        hours.push((start + i) % 24);
      }
      if (hours.includes(hour)) {
        return true;
      }
    }
    return false;
  };

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

  // Multi-step gradient interpolation
  const getGradientColor = (intensity: number, colors: string[]) => {
    if (intensity <= 0) return colors[0];
    if (intensity >= 1) return colors[colors.length - 1];

    const segments = colors.length - 1;
    const segmentSize = 1 / segments;
    const segmentIndex = Math.min(Math.floor(intensity / segmentSize), segments - 1);
    const segmentIntensity = (intensity - (segmentIndex * segmentSize)) / segmentSize;

    return interpolateColor(colors[segmentIndex], colors[segmentIndex + 1], segmentIntensity);
  };

  // Get quintile color based on quintile index
  // These colors match the Tailwind classes used in Quintile blocks
  const getQuintileColor = (quintileIndex: number) => {
    const colors = [
      '#7f1d1d', // bg-red-900 - Group 0 (Zero Conversions)
      '#f87171', // bg-red-400 - Group 1 (Worst Quartile)
      '#fde047', // bg-yellow-300 - Group 2 (2nd Quartile)
      '#4ade80', // bg-green-400 - Group 3 (3rd Quartile)
      '#14532d'  // bg-green-900 - Group 4 (Best Quartile)
    ];
    return colors[quintileIndex] || '#ffffff';
  };

  // Get color based on value using smooth gradient
  const getColor = (value: number, conversions?: number, cost?: number, day?: string, hour?: number) => {
    // Special handling for Quintiles Heatmap
    if (metricType === 'quintiles' && quintileData && day !== undefined && hour !== undefined) {
      const quintileIndex = quintileData.quintileMap.get(`${day}-${hour}`);
      if (quintileIndex !== undefined) {
        return getQuintileColor(quintileIndex);
      }
      return '#ffffff'; // Default white for cells not in any quintile
    }

    // Special handling for Performance Heatmap (cost-conversion)
    if (metricType === 'cost-conversion') {
      if (conversions === 0 || value === 0) {
        // Zero conversions = show based on cost (light red to dark red with more shades)
        // Find the max cost among zero-conversion cells
        const zeroCostValues = data
          .filter(d => (d.conversions === 0 || d.value === 0))
          .map(d => d.cost || 0);
        const maxZeroCost = Math.max(...zeroCostValues, 1);
        const minZeroCost = Math.min(...zeroCostValues.filter(c => c > 0), 0);

        if (cost === undefined || cost === 0) {
          return '#fee2e2'; // Very light red for zero cost
        }

        // Normalize cost value between min and max
        const costIntensity = maxZeroCost > minZeroCost
          ? (cost - minZeroCost) / (maxZeroCost - minZeroCost)
          : 0;

        // Multi-shade red gradient: very light red → light red → medium red → dark red → very dark red
        const redGradient = ['#fee2e2', '#fca5a5', '#f87171', '#dc2626', '#991b1b'];
        return getGradientColor(Math.min(costIntensity, 1), redGradient);
      } else {
        // Non-zero conversions = show based on cost/conversion ratio (dark green to light green)
        // Lower cost per conversion is better (dark green), higher is worse (light green)
        const intensity = Math.min(value / maxValue, 1);
        // Multi-shade green gradient: dark green → medium-dark green → medium green → light-medium green → light green
        const greenGradient = ['#065f46', '#047857', '#059669', '#10b981', '#6ee7b7'];
        return getGradientColor(intensity, greenGradient);
      }
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
    }

    // Fallback
    return interpolateColor('#ffffff', '#2da155', intensity);
  };

  // Get text color based on background brightness
  const getTextColor = (value: number, conversions?: number, cost?: number, day?: string, hour?: number) => {
    const bgColor = getColor(value, conversions, cost, day, hour);

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

  // Get ordered performance data for Performance Heatmap
  const getOrderedPerformance = () => {
    const zeroConversions: { day: string; hour: number; cost: number }[] = [];
    const nonZeroConversions: { day: string; hour: number; conversions: number; cost: number; costPerConversion: number }[] = [];

    DAYS.forEach(day => {
      HOURS.forEach(hour => {
        const cellData = getCellData(day, hour);
        if (cellData.conversions === 0) {
          zeroConversions.push({
            day,
            hour,
            cost: cellData.cost || 0
          });
        } else if (cellData.conversions && cellData.conversions > 0) {
          nonZeroConversions.push({
            day,
            hour,
            conversions: cellData.conversions,
            cost: cellData.cost || 0,
            costPerConversion: (cellData.cost || 0) / cellData.conversions
          });
        }
      });
    });

    // Sort zero conversions by cost (high to low)
    zeroConversions.sort((a, b) => b.cost - a.cost);

    // Sort non-zero conversions by cost/conversion (highest to lowest)
    nonZeroConversions.sort((a, b) => b.costPerConversion - a.costPerConversion);

    return { zeroConversions, nonZeroConversions };
  };

  const zeroConversionTimes = getZeroConversionTimes();
  const orderedPerformance = (metricType === 'cost-conversion' || metricType === 'quintiles') ? getOrderedPerformance() : null;

  // Get quintile breakdown by spend
  const getQuintileBreakdown = () => {
    if (!orderedPerformance) return null;

    // Combine all hours with their cost (worst to best performance)
    const allHours = [
      ...orderedPerformance.zeroConversions.map(item => ({
        day: item.day,
        hour: item.hour,
        cost: item.cost,
        conversions: 0,
        costPerConversion: Infinity
      })),
      ...orderedPerformance.nonZeroConversions.map(item => ({
        day: item.day,
        hour: item.hour,
        cost: item.cost,
        conversions: item.conversions,
        costPerConversion: item.costPerConversion
      }))
    ].filter(item => isHourInBlockGrouping(item.hour, blockGrouping));

    const totalSpend = allHours.reduce((sum, h) => sum + h.cost, 0);
    const quintileSpend = totalSpend * 0.2;

    const quintiles: Array<typeof allHours> = [[], [], [], [], []];
    const quintileMap = new Map<string, number>(); // Map of "day-hour" to quintile index
    let currentQuintile = 0;
    let currentQuintileSpend = 0;

    for (const hour of allHours) {
      if (currentQuintile < 4 && currentQuintileSpend + hour.cost > quintileSpend) {
        // Move to next quintile
        currentQuintile++;
        currentQuintileSpend = 0;
      }

      quintiles[currentQuintile].push(hour);
      quintileMap.set(`${hour.day}-${hour.hour}`, currentQuintile);
      currentQuintileSpend += hour.cost;
    }

    // Sort each quintile by day of week and hour
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    quintiles.forEach(quintile => {
      quintile.sort((a, b) => {
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.hour - b.hour;
      });
    });

    return {
      quintiles,
      quintileMap,
      totalSpend,
      quintileSpend
    };
  };

  const quintileData = (metricType === 'cost-conversion' || metricType === 'quintiles') && orderedPerformance ? getQuintileBreakdown() : null;

  // Merge hours into 4-hour blocks for quintile analysis
  // Each 4-hour block appears only once, assigned to a single quintile
  const merge4HourBlocks = (quintileData: ReturnType<typeof getQuintileBreakdown>) => {
    if (!quintileData) return null;

    // Get block starts based on current grouping
    const blockStarts = getBlockStarts(blockGrouping);

    // Helper function to find which block an hour belongs to
    const getBlockStartForHour = (hour: number): number | null => {
      for (const start of blockStarts) {
        const hours = [];
        for (let i = 0; i < 4; i++) {
          hours.push((start + i) % 24);
        }
        if (hours.includes(hour)) {
          return start;
        }
      }
      return null;
    };

    // Helper function to format time range
    const formatBlockTime = (start: number, end: number) => {
      const formatHour = (h: number) => {
        const hour = h % 24; // Handle wraparound
        if (hour === 0) return '12am';
        if (hour < 12) return `${hour}am`;
        if (hour === 12) return '12pm';
        return `${hour - 12}pm`;
      };
      return `${formatHour(start)}-${formatHour(end + 1)}`;
    };

    // Step 1: Aggregate all hours into 4-hour blocks across ALL quintiles
    const allBlocksMap = new Map<string, {
      day: string;
      blockLabel: string;
      hourRange: string;
      hours: number[];
      cost: number;
      conversions: number;
      costPerConversion: number;
    }>();

    quintileData.quintiles.forEach(quintile => {
      quintile.forEach(({ day, hour, cost, conversions }) => {
        const blockStart = getBlockStartForHour(hour);
        if (blockStart === null) return; // Skip hours not in current grouping

        const blockEnd = blockStart + 3; // Don't use modulo here - formatBlockTime handles it
        const blockKey = `${day}-${blockStart}`;

        if (!allBlocksMap.has(blockKey)) {
          allBlocksMap.set(blockKey, {
            day,
            blockLabel: formatBlockTime(blockStart, blockEnd),
            hourRange: `${blockStart}-${blockEnd}`,
            hours: [],
            cost: 0,
            conversions: 0,
            costPerConversion: 0
          });
        }

        const block = allBlocksMap.get(blockKey)!;
        block.hours.push(hour);
        block.cost += cost;
        block.conversions += conversions;
      });
    });

    // Step 2: Calculate CPA for each block and sort by performance (worst to best)
    const allBlocks = Array.from(allBlocksMap.values());
    allBlocks.forEach(block => {
      block.costPerConversion = block.conversions > 0 ? block.cost / block.conversions : Infinity;
    });

    // Step 3: Separate zero conversion blocks and blocks with conversions
    const zeroConversionBlocks = allBlocks.filter(block => block.conversions === 0);
    const blocksWithConversions = allBlocks.filter(block => block.conversions > 0);

    // Sort zero conversion blocks by cost (higher cost first)
    zeroConversionBlocks.sort((a, b) => b.cost - a.cost);

    // Sort blocks with conversions by CPA (higher CPA = worse)
    blocksWithConversions.sort((a, b) => b.costPerConversion - a.costPerConversion);

    // Step 4: Create Group 0 for zero conversions and divide rest into 4 quartiles
    const totalSpend = allBlocks.reduce((sum, block) => sum + block.cost, 0);
    const blocksWithConversionsSpend = blocksWithConversions.reduce((sum, block) => sum + block.cost, 0);
    const quartileSpend = blocksWithConversionsSpend * 0.25; // 25% for each quartile

    // Array of 5 groups: Group 0 (zero conversions) + Groups 1-4 (quartiles)
    const quintileBlocks: typeof allBlocks[] = [[], [], [], [], []];

    // Group 0: All zero conversion blocks
    quintileBlocks[0] = zeroConversionBlocks;

    // Groups 1-4: Divide blocks with conversions into quartiles by spend
    let currentQuartile = 1; // Start at group 1
    let currentQuartileSpend = 0;

    for (const block of blocksWithConversions) {
      if (currentQuartile < 4 && currentQuartileSpend + block.cost > quartileSpend) {
        currentQuartile++;
        currentQuartileSpend = 0;
      }

      quintileBlocks[currentQuartile].push(block);
      currentQuartileSpend += block.cost;
    }

    // Step 4: Sort blocks within each quintile by day and time
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    quintileBlocks.forEach(blocks => {
      blocks.sort((a, b) => {
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        const aStartHour = parseInt(a.hourRange.split('-')[0]);
        const bStartHour = parseInt(b.hourRange.split('-')[0]);
        return aStartHour - bStartHour;
      });
    });

    return quintileBlocks;
  };

  const fourHourQuintileData = quintileData ? merge4HourBlocks(quintileData) : null;

  // Format time for display
  const formatTime = (hour: number) => {
    return hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  };

  return (
    <div className="w-full">
      {/* Show heatmap for all views except quintiles */}
      {metricType !== 'quintiles' && (
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
                            backgroundColor: getColor(value, cellData.conversions, cellData.cost, day, hour),
                            color: getTextColor(value, cellData.conversions, cellData.cost, day, hour)
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
                              : value)
                          }
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
      )}

      {/* Legend - only show for non-quintiles views */}
      {metricType !== 'quintiles' && (
        <div className="flex items-center justify-center gap-3 mt-4 text-xs">
          {metricType === 'cost-conversion' ? (
          // Performance Heatmap has two separate scales at edges
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">Non-zero values:</span>
              <div className="flex gap-0.5 items-center">
                <div className="w-5 h-6 rounded-l" style={{ backgroundColor: '#065f46' }} title="Best (Lowest Cost/Conv)" />
                <div className="w-5 h-6" style={{ backgroundColor: '#047857' }} title="Very Good" />
                <div className="w-5 h-6" style={{ backgroundColor: '#059669' }} title="Good" />
                <div className="w-5 h-6" style={{ backgroundColor: '#10b981' }} title="Fair" />
                <div className="w-5 h-6 rounded-r" style={{ backgroundColor: '#6ee7b7' }} title="Worst (Highest Cost/Conv)" />
              </div>
              <span className="text-muted-foreground font-medium text-xs">(Dark Green = low CPA, Light Green = high CPA)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-medium">Zero conversions:</span>
              <div className="flex gap-0.5 items-center">
                <div className="w-5 h-6 rounded-l" style={{ backgroundColor: '#fee2e2' }} title="Lowest Cost" />
                <div className="w-5 h-6" style={{ backgroundColor: '#fca5a5' }} title="Low Cost" />
                <div className="w-5 h-6" style={{ backgroundColor: '#f87171' }} title="Medium Cost" />
                <div className="w-5 h-6" style={{ backgroundColor: '#dc2626' }} title="High Cost" />
                <div className="w-5 h-6 rounded-r" style={{ backgroundColor: '#991b1b' }} title="Highest Cost" />
              </div>
              <span className="text-muted-foreground font-medium text-xs">(Light Red = Low Cost, Dark Red = High Cost)</span>
            </div>
          </div>
        ) : (
          <>
            <span className="text-muted-foreground font-medium">
              Low ({metricType === 'conversion-cost' ? minValue.toFixed(2) : Math.round(minValue)})
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
              High ({metricType === 'conversion-cost' ? maxValue.toFixed(2) : Math.round(maxValue)})
            </span>
          </>
        )}
        </div>
      )}

      {/* Custom Tooltip */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap"
          style={{
            left: mousePosition.x + 200 > window.innerWidth
              ? `${mousePosition.x - 200}px`
              : `${mousePosition.x + 10}px`,
            top: mousePosition.y + 50 > window.innerHeight
              ? `${mousePosition.y - 40}px`
              : `${mousePosition.y + 10}px`,
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

      {/* Performance Ordered Lists for Performance Heatmap */}
      {!hideZeroList && metricType === 'cost-conversion' && orderedPerformance && (
        <div className="mt-6 space-y-4">
          {/* Zero Conversions - Cost High to Low */}
          {orderedPerformance.zeroConversions.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">
                Hours with Zero Conversions (Worst to Best by Cost) - {orderedPerformance.zeroConversions.length}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {orderedPerformance.zeroConversions.map(({ day, hour, cost }) => (
                  <div
                    key={`${day}-${hour}`}
                    className="text-xs bg-red-50 rounded px-2 py-1.5 border border-red-200"
                  >
                    <div className="font-medium">{day.slice(0, 3)} {formatTime(hour)}</div>
                    <div className="text-muted-foreground">${cost.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-Zero Conversions - Cost/Conversion Highest to Lowest */}
          {orderedPerformance.nonZeroConversions.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">
                Hours with Conversions (Worst to Best by Cost/Conversion) - {orderedPerformance.nonZeroConversions.length}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {orderedPerformance.nonZeroConversions.map(({ day, hour, conversions, cost, costPerConversion }) => (
                  <div
                    key={`${day}-${hour}`}
                    className="text-xs bg-green-50 rounded px-2 py-1.5 border border-green-200"
                  >
                    <div className="font-medium">{day.slice(0, 3)} {formatTime(hour)}</div>
                    <div className="text-muted-foreground">
                      ${costPerConversion.toFixed(2)} CPA
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {conversions} conv, ${cost.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Zero Conversions List for other metric types */}
      {!hideZeroList && metricType !== 'cost-conversion' && metricType !== 'quintiles' && zeroConversionTimes.length > 0 && (
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

      {/* Quintile Breakdown for Quintiles Analysis view only */}
      {!hideZeroList && metricType === 'quintiles' && quintileData && (
        <>
          <div className="mt-6 border border-gray-200 rounded-lg p-4">
            <div className="space-y-4 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  Quintiles Analysis
                </h3>
                {/* Block Size Tab selector */}
                <div className="flex gap-2 border border-gray-200 rounded-lg p-1">
                  <button
                    onClick={() => setQuintileBlockSize('1hour')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      quintileBlockSize === '1hour'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    1 Hour Block
                  </button>
                  <button
                    onClick={() => setQuintileBlockSize('4hour')}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      quintileBlockSize === '4hour'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    4 Hour Blocks
                  </button>
                </div>
              </div>

              {/* Block Grouping Filter Tabs - Only show for 4 Hour Blocks */}
              {quintileBlockSize === '4hour' && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-gray-700">Block Grouping:</span>
                  <div className="flex gap-2 border border-gray-200 rounded-lg p-1">
                    <button
                      onClick={() => setBlockGrouping('4-8-12')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        blockGrouping === '4-8-12'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      4-8-12
                    </button>
                    <button
                      onClick={() => setBlockGrouping('11-3-7')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        blockGrouping === '11-3-7'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      11-3-7
                    </button>
                    <button
                      onClick={() => setBlockGrouping('10-2-6')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        blockGrouping === '10-2-6'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      10-2-6
                    </button>
                    <button
                      onClick={() => setBlockGrouping('7-11-3')}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        blockGrouping === '7-11-3'
                          ? 'bg-green-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      7-11-3
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {blockGrouping === '4-8-12' && '(4am-8am, 8am-12pm, 12pm-4pm, 4pm-8pm, 8pm-12am, 12am-4am)'}
                    {blockGrouping === '11-3-7' && '(11am-3pm, 3pm-7pm, 7pm-11pm, 11pm-3am, 3am-7am, 7am-11am)'}
                    {blockGrouping === '10-2-6' && '(10am-2pm, 2pm-6pm, 6pm-10pm, 10pm-2am, 2am-6am, 6am-10am)'}
                    {blockGrouping === '7-11-3' && '(7am-11am, 11am-3pm, 3pm-7pm, 7pm-11pm, 11pm-3am, 3am-7am)'}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {quintileBlockSize === '1hour' ? (
                // 1 Hour Block View
                quintileData.quintiles.map((quintile, index) => {
                  const quintileSpend = quintile.reduce((sum, h) => sum + h.cost, 0);
                  const quintileConversions = quintile.reduce((sum, h) => sum + h.conversions, 0);
                  const quintileCPA = quintileConversions > 0 ? quintileSpend / quintileConversions : null;
                  const colors = [
                    { bg: 'bg-red-900', border: 'border-red-950', text: 'text-white', label: 'Worst Quintile' },
                    { bg: 'bg-red-400', border: 'border-red-500', text: 'text-white', label: '2nd Worst Quintile' },
                    { bg: 'bg-white', border: 'border-gray-300', text: 'text-gray-900', label: 'Middle Quintile' },
                    { bg: 'bg-blue-400', border: 'border-blue-500', text: 'text-white', label: '2nd Best Quintile' },
                    { bg: 'bg-blue-900', border: 'border-blue-950', text: 'text-white', label: 'Best Quintile' }
                  ];
                  const colorScheme = colors[index];

                  return (
                    <div key={index} className="bg-white border border-gray-300 rounded-lg p-3">
                      <div className="mb-2">
                        <div className="text-base font-bold text-gray-900 mb-1">{colorScheme.label}</div>
                        <div className="text-sm text-gray-900">
                          Total Cost: ${quintileSpend.toFixed(2)} | Total Hours: {quintile.length} | Conversions: {quintileConversions.toFixed(2)}
                          {quintileCPA !== null && <span className="font-extrabold text-lg ml-2">| CPA: ${quintileCPA.toFixed(2)}</span>}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {quintile.map(({ day, hour, cost, conversions, costPerConversion }) => {
                          return (
                            <div
                              key={`${day}-${hour}`}
                              className={`text-xs ${colorScheme.bg} ${colorScheme.border} border rounded px-2 py-1.5`}
                            >
                              <div className={`font-medium ${colorScheme.text}`}>
                                {day.slice(0, 3)} {formatTime(hour)}
                              </div>
                              <div className={`text-[9px] ${colorScheme.text} mt-1`}>
                                ${cost.toFixed(2)} | {conversions === 0 ? conversions.toFixed(1) : conversions.toFixed(2)} Conv{conversions > 0 && ` | CPA: ${costPerConversion.toFixed(2)}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                // 4 Hour Blocks View
                fourHourQuintileData && fourHourQuintileData.map((quintileBlocks, index) => {
                  const quintileSpend = quintileBlocks.reduce((sum, b) => sum + b.cost, 0);
                  const quintileConversions = quintileBlocks.reduce((sum, b) => sum + b.conversions, 0);
                  const quintileCPA = quintileConversions > 0 ? quintileSpend / quintileConversions : null;

                  // Calculate total spend for percentage (only for Group 0)
                  const totalSpend = fourHourQuintileData.flat().reduce((sum, b) => sum + b.cost, 0);
                  const spendPercentage = (quintileSpend / totalSpend) * 100;

                  const colors = [
                    { bg: 'bg-red-900', border: 'border-red-950', text: 'text-white', label: 'Group 0 (Zero Conversions)' },
                    { bg: 'bg-red-400', border: 'border-red-500', text: 'text-white', label: 'Group 1 (Worst Quartile)' },
                    { bg: 'bg-yellow-300', border: 'border-yellow-400', text: 'text-gray-900', label: 'Group 2 (2nd Quartile)' },
                    { bg: 'bg-green-400', border: 'border-green-500', text: 'text-white', label: 'Group 3 (3rd Quartile)' },
                    { bg: 'bg-green-900', border: 'border-green-950', text: 'text-white', label: 'Group 4 (Best Quartile)' }
                  ];
                  const colorScheme = colors[index];

                  return (
                    <div key={index} className="bg-white border border-gray-300 rounded-lg p-3">
                      <div className="mb-2">
                        <div className="text-base font-bold text-gray-900 mb-1">{colorScheme.label}</div>
                        <div className="text-sm text-gray-900">
                          Total Cost: ${quintileSpend.toFixed(2)} | Total Blocks: {quintileBlocks.length} | Conversions: {quintileConversions.toFixed(2)}
                          {index === 0 ? (
                            // Group 0: Show spend percentage as prominent
                            <span className="font-extrabold text-lg ml-2">| Spend: {spendPercentage.toFixed(1)}%</span>
                          ) : (
                            // Groups 1-4: Show CPA as prominent
                            quintileCPA !== null && <span className="font-extrabold text-lg ml-2">| CPA: ${quintileCPA.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {quintileBlocks.map((block) => {
                          return (
                            <div
                              key={`${block.day}-${block.hourRange}`}
                              className={`text-xs ${colorScheme.bg} ${colorScheme.border} border rounded px-2 py-1.5`}
                            >
                              <div className={`font-medium ${colorScheme.text}`}>
                                {block.day.slice(0, 3)} {block.blockLabel}
                              </div>
                              <div className={`text-[9px] ${colorScheme.text} mt-1`}>
                                ${block.cost.toFixed(2)} | {block.conversions === 0 ? block.conversions.toFixed(1) : block.conversions.toFixed(2)} Conv{block.conversions > 0 && ` | CPA: ${block.costPerConversion.toFixed(2)}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Calendar View */}
          <CalendarView
            data={data}
            quintileData={quintileData}
            blockSize={'4hour'}
            blockGrouping={blockGrouping}
            fourHourQuintileData={fourHourQuintileData}
          />
        </>
      )}
    </div>
  );
}
