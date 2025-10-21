import { createPool, VercelPool } from '@vercel/postgres';

let pool: VercelPool | null = null;

// Retry helper for transient database errors
async function retryQuery<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastRetry = i === maxRetries - 1;
      const dbError = error as { code?: string; message?: string };
      const isRetryable =
        dbError.code === 'XX000' ||
        dbError.message?.includes('timeout') ||
        dbError.message?.includes('terminated') ||
        dbError.message?.includes('Connection terminated');

      if (isLastRetry || !isRetryable) {
        throw error;
      }

      console.log(`Query failed, retrying (${i + 1}/${maxRetries})...`);
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}

// Lazy initialization of the pool with proper configuration
function getPool() {
  if (!pool) {
    pool = createPool({
      connectionString: process.env.POSTGRES_POSTGRES_URL!,
      max: 20, // Maximum pool size (increase from default 10)
      idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      connectionTimeoutMillis: 10000, // Timeout when trying to get connection from pool
    });
  }
  return pool;
}

export async function initDatabase() {
  try {
    // Create table for storing CSV/Excel files with sheet support
    const client = await getPool().connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS csv_files (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          sheet_name VARCHAR(255) DEFAULT NULL,
          content TEXT NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(filename, sheet_name)
        )
      `);
      console.log('Database initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

export async function getAllCSVFiles() {
  try {
    const client = await getPool().connect();
    try {
      // Get distinct filenames with their most recent upload time
      const result = await client.query(`
        SELECT filename, MAX(uploaded_at) as uploaded_at
        FROM csv_files
        GROUP BY filename
        ORDER BY uploaded_at DESC
      `);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching CSV files:', error);
    return [];
  }
}

export async function getSheetsByFilename(filename: string) {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        'SELECT DISTINCT sheet_name FROM csv_files WHERE filename = $1 AND sheet_name IS NOT NULL ORDER BY sheet_name',
        [filename]
      );
      return result.rows.map(row => row.sheet_name);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching sheets:', error);
    return [];
  }
}

export async function getCSVFileByName(filename: string, sheetName?: string) {
  return retryQuery(async () => {
    const client = await getPool().connect();
    try {
      // Set statement timeout to 5 seconds
      await client.query('SET statement_timeout = 5000');

      const result = await client.query(
        'SELECT content FROM csv_files WHERE filename = $1 AND (sheet_name = $2 OR ($2 IS NULL AND sheet_name IS NULL)) LIMIT 1',
        [filename, sheetName || null]
      );
      return result.rows[0]?.content || null;
    } finally {
      client.release();
    }
  });
}

export async function saveCSVFile(filename: string, content: string, sheetName?: string) {
  try {
    const client = await getPool().connect();
    try {
      await client.query(
        `INSERT INTO csv_files (filename, sheet_name, content)
         VALUES ($1, $2, $3)
         ON CONFLICT (filename, sheet_name)
         DO UPDATE SET content = $3, uploaded_at = CURRENT_TIMESTAMP`,
        [filename, sheetName || null, content]
      );
      return { success: true };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving CSV file:', error);
    return { success: false, error };
  }
}

export async function deleteCSVFile(filename: string) {
  try {
    const client = await getPool().connect();
    try {
      await client.query('DELETE FROM csv_files WHERE filename = $1', [filename]);
      return { success: true };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting CSV file:', error);
    return { success: false, error };
  }
}
