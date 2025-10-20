import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    hasPostgresUrl: !!process.env.POSTGRES_URL,
    hasStorageUrl: !!process.env.STORAGE_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    postgresPrefix: Object.keys(process.env).filter(k => k.startsWith('POSTGRES_')),
    storagePrefix: Object.keys(process.env).filter(k => k.startsWith('STORAGE_')),
  };

  return NextResponse.json(envVars);
}
