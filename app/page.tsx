"use client";

import { useState, useEffect } from 'react';
import { Heatmap } from '@/components/heatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/file-upload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CSVData {
  "Hour of the day": string;
  "Day of the week": string;
  "Conversions": string;
}

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
}

export default function Home() {
  const [csvFiles, setCSVFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch list of CSV files
  useEffect(() => {
    fetchCSVFiles();
  }, []);

  // Fetch sheets when file is selected
  useEffect(() => {
    if (selectedFile) {
      fetchSheets(selectedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  // Load CSV data when file and sheet are selected
  useEffect(() => {
    if (selectedFile) {
      loadCSVData(selectedFile, selectedSheet);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile, selectedSheet]);

  const fetchCSVFiles = async () => {
    try {
      const response = await fetch('/api/csv-files');
      const files = await response.json();
      setCSVFiles(files);
      if (files.length > 0) {
        setSelectedFile(files[0]);
      }
    } catch (error) {
      console.error('Error fetching CSV files:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text: string): CSVData[] => {
    const lines = text.trim().split('\n');

    // Find the header row (look for "Hour of the day")
    let headerIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Hour of the day')) {
        headerIndex = i;
        break;
      }
    }

    const headers = lines[headerIndex].split(',').map(h => h.replace(/"/g, '').trim());
    const data: CSVData[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      const values = lines[i].split(',');
      const row: CSVData = {
        "Hour of the day": "",
        "Day of the week": "",
        "Conversions": ""
      };
      headers.forEach((header, index) => {
        if (header === "Hour of the day" || header === "Day of the week" || header === "Conversions") {
          row[header] = values[index]?.trim() || "";
        }
      });
      data.push(row);
    }

    return data;
  };

  const fetchSheets = async (filename: string) => {
    try {
      const response = await fetch(`/api/sheets/${encodeURIComponent(filename)}`);
      const sheetList = await response.json();
      setSheets(sheetList);
      // Auto-select first sheet if available
      if (sheetList.length > 0) {
        setSelectedSheet(sheetList[0]);
      } else {
        setSelectedSheet('');
      }
    } catch (error) {
      console.error('Error fetching sheets:', error);
      setSheets([]);
      setSelectedSheet('');
    }
  };

  const loadCSVData = async (filename: string, sheetName: string) => {
    try {
      const url = sheetName
        ? `/api/csv/${encodeURIComponent(filename)}?sheet=${encodeURIComponent(sheetName)}`
        : `/api/csv/${encodeURIComponent(filename)}`;
      const response = await fetch(url);
      const text = await response.text();
      const csvData = parseCSV(text);

      // Transform to heatmap format
      const transformed: HeatmapData[] = csvData.map(row => ({
        hour: parseInt(row["Hour of the day"]),
        day: row["Day of the week"].trim(),
        value: parseFloat(row["Conversions"]) || 0
      }));

      setHeatmapData(transformed);
    } catch (error) {
      console.error('Error loading CSV data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-2 bg-background">
      <div className="max-w-7xl mx-auto space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Heatmap Viewer</h1>
          </div>
          <div className="flex items-center gap-4">
            <FileUpload onUploadSuccess={fetchCSVFiles} />
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select a file" />
              </SelectTrigger>
              <SelectContent>
                {csvFiles.map(file => (
                  <SelectItem key={file} value={file}>
                    {file}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sheets.length > 0 && (
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a sheet" />
                </SelectTrigger>
                <SelectContent>
                  {sheets.map(sheet => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Heatmap */}
        <Card>
          <CardHeader className="pb-1 pt-2">
            <CardTitle className="text-sm">Conversion Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            {heatmapData.length > 0 ? (
              <Heatmap data={heatmapData} />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
