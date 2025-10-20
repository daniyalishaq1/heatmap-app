import { NextResponse } from 'next/server';
import { getCSVFileByName } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheet');

    const content = await getCSVFileByName(filename, sheetName || undefined);

    if (!content) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv',
      },
    });
  } catch (error) {
    console.error('Error reading CSV file:', error);
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
