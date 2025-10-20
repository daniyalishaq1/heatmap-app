import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { saveCSVFile } from '@/lib/db';

export async function POST() {
  try {
    const dataDir = join('/Users/daniyal/Heatmaps', 'Data');
    const files = await readdir(dataDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));

    const results = [];
    for (const filename of csvFiles) {
      const filePath = join(dataDir, filename);
      const content = await readFile(filePath, 'utf-8');
      const result = await saveCSVFile(filename, content);
      results.push({ filename, success: result.success });
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      results
    });
  } catch (error) {
    console.error('Error migrating files:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed'
    }, { status: 500 });
  }
}
