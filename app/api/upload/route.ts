import { NextResponse } from 'next/server';
import { saveCSVFile } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCSV = file.name.endsWith('.csv');

    if (!isExcel && !isCSV) {
      return NextResponse.json({ error: 'Only CSV and Excel files are allowed' }, { status: 400 });
    }

    if (isCSV) {
      // Handle CSV files (single sheet)
      const content = await file.text();
      const result = await saveCSVFile(file.name, content);

      if (!result.success) {
        return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        filename: file.name,
        sheets: [null],
        message: 'CSV file uploaded successfully'
      });
    } else {
      // Handle Excel files (multiple sheets) - dynamic import to reduce bundle size
      const XLSX = await import('xlsx');
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheets: string[] = [];
      let successCount = 0;

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csvContent = XLSX.utils.sheet_to_csv(worksheet);

        const result = await saveCSVFile(file.name, csvContent, sheetName);

        if (result.success) {
          sheets.push(sheetName);
          successCount++;
        }
      }

      if (successCount === 0) {
        return NextResponse.json({ error: 'Failed to save any sheets' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        filename: file.name,
        sheets,
        message: `Excel file uploaded successfully with ${successCount} sheet(s)`
      });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
