import fs from 'fs/promises';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), '.local-storage');

// Initialize storage directory
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

export async function saveFileLocally(filename: string, content: string, sheetName?: string) {
  try {
    await ensureStorageDir();

    const fileData = {
      filename,
      sheetName: sheetName || null,
      content,
      uploadedAt: new Date().toISOString()
    };

    const sanitizedFilename = filename.replace(/[^a-z0-9.-]/gi, '_');
    const sanitizedSheet = sheetName ? `_${sheetName.replace(/[^a-z0-9.-]/gi, '_')}` : '';
    const filePath = path.join(STORAGE_DIR, `${sanitizedFilename}${sanitizedSheet}.json`);

    await fs.writeFile(filePath, JSON.stringify(fileData, null, 2));
    return { success: true };
  } catch (error) {
    console.error('Error saving file locally:', error);
    return { success: false, error };
  }
}

export async function getAllFilesLocally() {
  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);

    const fileMap = new Map<string, { filename: string; uploadedAt: string }>();

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(STORAGE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (!fileMap.has(data.filename)) {
          fileMap.set(data.filename, {
            filename: data.filename,
            uploadedAt: data.uploadedAt
          });
        }
      }
    }

    return Array.from(fileMap.values())
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
      .map(f => f.filename);
  } catch (error) {
    console.error('Error getting files locally:', error);
    return [];
  }
}

export async function getSheetsLocally(filename: string) {
  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);

    const sheets: string[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(STORAGE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.filename === filename && data.sheetName) {
          sheets.push(data.sheetName);
        }
      }
    }

    return sheets.sort();
  } catch (error) {
    console.error('Error getting sheets locally:', error);
    return [];
  }
}

export async function getFileContentLocally(filename: string, sheetName?: string) {
  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(STORAGE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        const sheetMatch = sheetName ? data.sheetName === sheetName : !data.sheetName;

        if (data.filename === filename && sheetMatch) {
          return data.content;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting file content locally:', error);
    return null;
  }
}

export async function deleteFileLocally(filename: string) {
  try {
    await ensureStorageDir();
    const files = await fs.readdir(STORAGE_DIR);

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(STORAGE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.filename === filename) {
          await fs.unlink(filePath);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting file locally:', error);
    return { success: false, error };
  }
}
