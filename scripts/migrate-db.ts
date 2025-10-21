import { createPool } from '@vercel/postgres';

async function migrate() {
  const pool = createPool({
    connectionString: process.env.POSTGRES_POSTGRES_URL!,
  });

  const client = await pool.connect();

  try {
    console.log('Adding sheet_name column...');

    // Add sheet_name column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'csv_files' AND column_name = 'sheet_name'
        ) THEN
          ALTER TABLE csv_files ADD COLUMN sheet_name VARCHAR(255) DEFAULT NULL;
          RAISE NOTICE 'Column sheet_name added';
        ELSE
          RAISE NOTICE 'Column sheet_name already exists';
        END IF;
      END $$;
    `);

    console.log('Updating unique constraint...');

    // Drop old unique constraint and add new one with sheet_name
    await client.query(`
      DO $$
      BEGIN
        -- Drop existing unique constraint if exists
        ALTER TABLE csv_files DROP CONSTRAINT IF EXISTS csv_files_filename_key;

        -- Add new unique constraint on both filename and sheet_name
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'csv_files_filename_sheet_name_key'
        ) THEN
          ALTER TABLE csv_files ADD CONSTRAINT csv_files_filename_sheet_name_key UNIQUE (filename, sheet_name);
          RAISE NOTICE 'Unique constraint added';
        ELSE
          RAISE NOTICE 'Unique constraint already exists';
        END IF;
      END $$;
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
