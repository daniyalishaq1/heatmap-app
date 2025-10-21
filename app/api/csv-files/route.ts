import { NextResponse } from 'next/server';
import { getAllCSVFiles } from '@/lib/db';
import { getAllFilesLocally } from '@/lib/local-storage';

const USE_LOCAL_STORAGE = process.env.NODE_ENV === 'development';

export async function GET() {
  try {
    if (USE_LOCAL_STORAGE) {
      const filenames = await getAllFilesLocally();
      return NextResponse.json(filenames);
    } else {
      const files = await getAllCSVFiles();
      const filenames = files.map(file => file.filename);
      return NextResponse.json(filenames);
    }
  } catch (error) {
    console.error('Error reading CSV files:', error);
    return NextResponse.json({ error: 'Failed to read CSV files' }, { status: 500 });
  }
}
