import { NextResponse } from 'next/server';
import { getSheetsByFilename } from '@/lib/db';
import { getSheetsLocally } from '@/lib/local-storage';

const USE_LOCAL_STORAGE = process.env.NODE_ENV === 'development';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const sheets = USE_LOCAL_STORAGE
      ? await getSheetsLocally(filename)
      : await getSheetsByFilename(filename);

    return NextResponse.json(sheets);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json({ error: 'Failed to fetch sheets' }, { status: 500 });
  }
}
