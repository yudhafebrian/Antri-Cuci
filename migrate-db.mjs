import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const NEON_URL = process.env.NEONDB_CONNECTION_STRING.replace(/^psql\s*['"]?|['"]?$/g, '').trim();
const SUPABASE_URL = process.env.SUPABASE_SESSION_POOLER_CONNECTION_STRING_IPV4 || process.env.SUPABASE_DIRECT_CONNECTION_STRING_IPV6;

async function migrate() {
  console.log('Connecting to source (NeonDB)...');
  const sourceClient = new Client({ connectionString: NEON_URL });
  await sourceClient.connect();

  console.log('Connecting to destination (Supabase)...');
  const destClient = new Client({ connectionString: SUPABASE_URL });
  await destClient.connect();

  try {
    console.log('Fetching tables from source...');
    const tablesRes = await sourceClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Found ${tables.length} tables:`, tables);

    for (const table of tables) {
      console.log(`\nMigrating table: ${table}`);
      
      // 1. Get schema
      const colsRes = await sourceClient.query(`
        SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);

      const colDefs = colsRes.rows.map(col => {
        let type = col.data_type.toUpperCase();
        if (type === 'CHARACTER VARYING' && col.character_maximum_length) {
          type = `VARCHAR(${col.character_maximum_length})`;
        } else if (type === 'CHARACTER VARYING') {
          type = 'VARCHAR';
        } else if (type === 'CHARACTER') {
          type = 'CHAR';
        } else if (type === 'USER-DEFINED') {
          type = col.data_type; // e.g., uuid, jsonb might show up differently, but let's try
        }
        
        // Fix common Neon/Postgres type mappings
        if (col.data_type === 'uuid') type = 'UUID';
        if (col.data_type === 'jsonb') type = 'JSONB';
        if (col.data_type === 'json') type = 'JSON';
        if (col.data_type === 'timestamp without time zone') type = 'TIMESTAMP';
        if (col.data_type === 'timestamp with time zone') type = 'TIMESTAMPTZ';
        if (col.data_type === 'time without time zone') type = 'TIME';
        if (col.data_type === 'double precision') type = 'DOUBLE PRECISION';
        if (col.data_type === 'boolean') type = 'BOOLEAN';
        if (col.data_type === 'integer') type = 'INTEGER';
        if (col.data_type === 'bigint') type = 'BIGINT';
        if (col.data_type === 'text') type = 'TEXT';

        let def = `"${col.column_name}" ${type}`;
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        return def;
      });

      const createTableSQL = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${colDefs.join(',\n  ')}\n);`;
      console.log(`Creating table ${table}...`);
      await destClient.query(createTableSQL);

      // 2. Migrate data
      console.log(`Fetching data from ${table}...`);
      const dataRes = await sourceClient.query(`SELECT * FROM "${table}"`);
      const rows = dataRes.rows;
      
      if (rows.length === 0) {
        console.log(`  No data to migrate for ${table}.`);
        continue;
      }

      console.log(`  Inserting ${rows.length} rows into ${table}...`);
      
      // Batch insert to avoid huge queries
      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const columns = Object.keys(batch[0]);
        
        // Build INSERT query with parameterized values
        const placeholders = batch.map((_, rowIdx) => {
          return `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`;
        }).join(', ');
        
        const values = batch.flatMap(row => columns.map(col => row[col]));
        const insertSQL = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders} ON CONFLICT DO NOTHING;`;
        
        await destClient.query(insertSQL, values);
      }
      console.log(`  Successfully migrated ${rows.length} rows for ${table}.`);
    }

    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sourceClient.end();
    await destClient.end();
  }
}

migrate();
