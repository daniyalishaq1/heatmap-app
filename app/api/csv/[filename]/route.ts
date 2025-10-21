import { NextResponse } from 'next/server';
import { getCSVFileByName, deleteCSVFile } from '@/lib/db';
import { getFileContentLocally, deleteFileLocally } from '@/lib/local-storage';

const USE_LOCAL_STORAGE = process.env.NODE_ENV === 'development';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const { searchParams } = new URL(request.url);
    const sheetName = searchParams.get('sheet');

    const content = USE_LOCAL_STORAGE
      ? await getFileContentLocally(filename, sheetName || undefined)
      : await getCSVFileByName(filename, sheetName || undefined);

    if (!content) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'public, max-age=60', // Cache for 60 seconds
      },
    });
  } catch (error) {
    console.error('Error reading CSV file:', error);

    // Return appropriate status based on error type
    const dbError = error as { code?: string; message?: string };
    const isTimeout = dbError.code === 'XX000' || dbError.message?.includes('timeout');
    const status = isTimeout ? 503 : 404; // 503 Service Unavailable for timeouts

    return NextResponse.json(
      {
        error: isTimeout ? 'Database temporarily unavailable' : 'File not found',
        message: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
      },
      { status }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const result = USE_LOCAL_STORAGE
      ? await deleteFileLocally(filename)
      : await deleteCSVFile(filename);

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting CSV file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
