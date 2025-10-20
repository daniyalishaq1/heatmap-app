import { NextResponse } from 'next/server';
import { getAllCSVFiles } from '@/lib/db';

export async function GET() {
  try {
    const files = await getAllCSVFiles();
    const filenames = files.map(file => file.filename);

    return NextResponse.json(filenames);
  } catch (error) {
    console.error('Error reading CSV files:', error);
    return NextResponse.json({ error: 'Failed to read CSV files' }, { status: 500 });
  }
}
