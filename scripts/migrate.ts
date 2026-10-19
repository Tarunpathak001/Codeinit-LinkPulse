import pkg from "@next/env";
const { loadEnvConfig } = pkg;
import postgres from "postgres";
import { readFile } from "node:fs/promises";
loadEnvConfig(process.cwd());
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL");
const client = postgres(url, { prepare: false, max: 1 });
try {
  await client.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(481701)`;
    await tx`create table if not exists linkpulse_migrations(name text primary key, applied_at timestamptz default now())`;
    const name = "0001_initial.sql";
    const applied =
      await tx`select name from linkpulse_migrations where name=${name}`;
    if (!applied.length) {
      await tx.unsafe(await readFile("db/migrations/" + name, "utf8"));
      await tx`insert into linkpulse_migrations(name) values(${name})`;
      console.log("Applied", name);
    } else console.log("Already up to date");
  });
} finally {
  await client.end();
}
