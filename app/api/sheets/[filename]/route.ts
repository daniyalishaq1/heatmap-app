import { NextResponse } from 'next/server';
import { getSheetsByFilename } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const sheets = await getSheetsByFilename(filename);

    return NextResponse.json(sheets);
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return NextResponse.json({ error: 'Failed to fetch sheets' }, { status: 500 });
  }
}
