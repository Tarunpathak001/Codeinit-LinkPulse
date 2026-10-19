import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
let instance: ReturnType<typeof create> | undefined;
function create() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  return drizzle(
    postgres(process.env.DATABASE_URL, { prepare: false, max: 5 }),
    { schema },
  );
}
export function db() {
  return (instance ??= create());
}
export type Database = ReturnType<typeof db>;
