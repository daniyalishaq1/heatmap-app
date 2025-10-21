"use client";

import { useState, useEffect } from 'react';
import { Heatmap } from '@/components/heatmap';
import { Card, CardContent } from '@/components/ui/card';
import { FileUpload } from '@/components/file-upload';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CSVData {
  "Hour of the day": string;
  "Day of the week": string;
  "Conversions": string;
  "Cost": string;
}

interface HeatmapData {
  hour: number;
  day: string;
  value: number;
  conversions?: number;
  cost?: number;
}

interface FileWithSheets {
  filename: string;
  sheets: string[];
}

type HeatmapView = 'conversions' | 'cost' | 'conversion-cost' | 'cost-conversion' | 'all';

export default function Home() {
  const [files, setFiles] = useState<FileWithSheets[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [costData, setCostData] = useState<HeatmapData[]>([]);
  const [conversionCostData, setConversionCostData] = useState<HeatmapData[]>([]);
  const [costConversionData, setCostConversionData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string>('');
  const [selectedView, setSelectedView] = useState<HeatmapView>('conversions');

  // Fetch list of CSV files
  useEffect(() => {
    fetchCSVFiles();
  }, []);

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
      const fileList = await response.json();

      // Fetch sheets for each file
      const filesWithSheets = await Promise.all(
        fileList.map(async (filename: string) => {
          const sheetsResponse = await fetch(`/api/sheets/${encodeURIComponent(filename)}`);
          const sheets = await sheetsResponse.json();
          return {
            filename,
            sheets
          };
        })
      );

      setFiles(filesWithSheets);
      if (filesWithSheets.length > 0) {
        setSelectedFile(filesWithSheets[0].filename);
        if (filesWithSheets[0].sheets.length > 0) {
          setSelectedSheet(filesWithSheets[0].sheets[0]);
        }
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
        "Conversions": "",
        "Cost": ""
      };
      headers.forEach((header, index) => {
        if (header === "Hour of the day" || header === "Day of the week" || header === "Conversions" || header === "Cost") {
          row[header] = values[index]?.trim() || "";
        }
      });
      data.push(row);
    }

    return data;
  };

  const handleFileSelect = (filename: string) => {
    setSelectedFile(filename);
    const file = files.find(f => f.filename === filename);
    if (file && file.sheets.length > 0) {
      setSelectedSheet(file.sheets[0]);
    } else {
      setSelectedSheet('');
    }
  };

  const handleSheetSelect = (sheet: string) => {
    setSelectedSheet(sheet);
  };

  const handleDeleteClick = (filename: string) => {
    setFileToDelete(filename);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // Immediately update UI - remove file from list
      const updatedFiles = files.filter(f => f.filename !== fileToDelete);
      setFiles(updatedFiles);

      // Close dialog immediately
      setDeleteDialogOpen(false);

      // If deleted file was selected, select first remaining file
      if (selectedFile === fileToDelete) {
        if (updatedFiles.length > 0) {
          setSelectedFile(updatedFiles[0].filename);
          if (updatedFiles[0].sheets.length > 0) {
            setSelectedSheet(updatedFiles[0].sheets[0]);
          } else {
            setSelectedSheet('');
          }
        } else {
          setSelectedFile('');
          setSelectedSheet('');
        }
      }

      setFileToDelete('');

      // Perform actual delete in background
      const response = await fetch(`/api/csv/${encodeURIComponent(fileToDelete)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        console.error('Failed to delete file from server');
        // Refresh to sync with server state
        await fetchCSVFiles();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      // Refresh to sync with server state
      await fetchCSVFiles();
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

      // Transform to heatmap format for conversions
      const conversions: HeatmapData[] = csvData.map(row => {
        const conv = parseFloat(row["Conversions"]) || 0;
        const costVal = parseFloat(row["Cost"]) || 0;
        return {
          hour: parseInt(row["Hour of the day"]),
          day: row["Day of the week"].trim(),
          value: conv,
          conversions: conv,
          cost: costVal
        };
      });

      // Transform for cost
      const cost: HeatmapData[] = csvData.map(row => {
        const conv = parseFloat(row["Conversions"]) || 0;
        const costVal = parseFloat(row["Cost"]) || 0;
        return {
          hour: parseInt(row["Hour of the day"]),
          day: row["Day of the week"].trim(),
          value: costVal,
          conversions: conv,
          cost: costVal
        };
      });

      // Calculate conversion/cost ratio
      const conversionCost: HeatmapData[] = csvData.map(row => {
        const conv = parseFloat(row["Conversions"]) || 0;
        const costVal = parseFloat(row["Cost"]) || 0;
        return {
          hour: parseInt(row["Hour of the day"]),
          day: row["Day of the week"].trim(),
          value: costVal > 0 ? conv / costVal : 0,
          conversions: conv,
          cost: costVal
        };
      });

      // Calculate cost/conversion ratio
      const costConversion: HeatmapData[] = csvData.map(row => {
        const conv = parseFloat(row["Conversions"]) || 0;
        const costVal = parseFloat(row["Cost"]) || 0;
        return {
          hour: parseInt(row["Hour of the day"]),
          day: row["Day of the week"].trim(),
          value: conv > 0 ? costVal / conv : 0,
          conversions: conv,
          cost: costVal
        };
      });

      setHeatmapData(conversions);
      setCostData(cost);
      setConversionCostData(conversionCost);
      setCostConversionData(costConversion);
    } catch (error) {
      console.error('Error loading CSV data:', error);
    }
  };

  const getViewTitle = (view: HeatmapView): string => {
    switch (view) {
      case 'conversions':
        return 'Conversion Heatmap';
      case 'cost':
        return 'Cost Heatmap';
      case 'conversion-cost':
        return 'Conversion/Cost Heatmap';
      case 'cost-conversion':
        return 'Cost/Conversion Heatmap';
      case 'all':
        return 'All Views';
      default:
        return 'Heatmap';
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
    <main className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-72 border-r bg-muted/30 flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold mb-4">Heatmap Viewer</h1>
          <FileUpload onUploadSuccess={fetchCSVFiles} />
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {files.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No files uploaded yet
            </div>
          ) : (
            <div className="py-2">
              {files.map(file => (
                <div key={file.filename}>
                  {/* File Item */}
                  <div
                    className={`group flex items-center justify-between px-4 py-2 hover:bg-muted cursor-pointer ${
                      selectedFile === file.filename ? 'bg-muted' : ''
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 flex-1 overflow-hidden"
                      onClick={() => handleFileSelect(file.filename)}
                    >
                      <span className="text-sm truncate flex-1" title={file.filename}>
                        {file.filename}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(file.filename);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 active:bg-red-100 rounded transition-all cursor-pointer"
                      title="Delete file"
                    >
                      <Trash2 className="h-4 w-4 text-red-600 hover:text-red-700" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Sheet Tabs */}
        {(() => {
          if (!selectedFile) return null;

          const currentFile = files.find(f => f.filename === selectedFile);
          const sheets = currentFile?.sheets || [];

          // If no sheets (CSV file), create a single tab with the filename
          const tabsToDisplay = sheets.length > 0 ? sheets : [selectedFile];

          return (
            <div className="border-b bg-muted/30 px-4 flex items-end overflow-x-auto">
              {tabsToDisplay.map(sheet => (
                <div
                  key={sheet}
                  className={`px-4 py-2 cursor-pointer border-t border-l border-r rounded-t-md text-sm transition-colors ${
                    selectedSheet === sheet || (sheets.length === 0 && selectedSheet === '')
                      ? 'bg-background border-background -mb-px font-semibold border-b-2 border-b-background'
                      : 'bg-muted/50 hover:bg-muted border-border'
                  }`}
                  onClick={() => handleSheetSelect(sheet)}
                  title={sheet}
                >
                  <span className="max-w-[150px] truncate inline-block">{sheet}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Heatmap Content */}
        <div className="flex-1 p-4 flex flex-col">
          {/* View Selector */}
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold">{getViewTitle(selectedView)}</h2>
            <Select value={selectedView} onValueChange={(value) => setSelectedView(value as HeatmapView)}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversions">Conversion Heatmap</SelectItem>
                <SelectItem value="cost">Cost Heatmap</SelectItem>
                <SelectItem value="conversion-cost">Conversion/Cost Heatmap</SelectItem>
                <SelectItem value="cost-conversion">Cost/Conversion Heatmap</SelectItem>
                <SelectItem value="all">All Views</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Render based on selected view */}
          <Card className="flex-1">
            <CardContent className="p-4">
              {heatmapData.length > 0 ? (
                selectedView === 'all' ? (
                  <div className="grid grid-cols-2 gap-4 h-full">
                    <div className="border-r border-b p-4">
                      <h3 className="text-sm font-semibold mb-2">Conversion Heatmap</h3>
                      <Heatmap data={heatmapData} metricType="conversions" hideZeroList={true} />
                    </div>
                    <div className="border-b p-4">
                      <h3 className="text-sm font-semibold mb-2">Cost Heatmap</h3>
                      <Heatmap data={costData} metricType="cost" hideZeroList={true} />
                    </div>
                    <div className="border-r p-4">
                      <h3 className="text-sm font-semibold mb-2">Conversion/Cost Heatmap</h3>
                      <Heatmap data={conversionCostData} metricType="conversion-cost" hideZeroList={true} />
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold mb-2">Cost/Conversion Heatmap</h3>
                      <Heatmap data={costConversionData} metricType="cost-conversion" hideZeroList={true} />
                    </div>
                  </div>
                ) : (
                  <Heatmap
                    data={
                      selectedView === 'conversions' ? heatmapData :
                      selectedView === 'cost' ? costData :
                      selectedView === 'conversion-cost' ? conversionCostData :
                      costConversionData
                    }
                    metricType={selectedView}
                  />
                )
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{fileToDelete}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setDeleteDialogOpen(false)}
              className="hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
