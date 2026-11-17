"use strict";
// Postgres access. Production: Neon via DATABASE_URL. Tests: in-process Postgres (PGlite) when PGLITE=1.
let run, execAll;
if (process.env.PGLITE === "1") {
  const { PGlite } = require("@electric-sql/pglite");
  const pg = new PGlite();
  const pre = process.env.PGLITE_PRESQL ? pg.exec(require("fs").readFileSync(process.env.PGLITE_PRESQL, "utf8")) : Promise.resolve(); // test-only
  run = async (t, p) => { await pre; return (await pg.query(t, p || [])).rows; };
  execAll = async (s) => { await pre; return pg.exec(s); };
} else {
  const { Pool, types } = require("pg");
  types.setTypeParser(20, (v) => parseInt(v, 10)); // int8 -> number
  if (!process.env.DATABASE_URL) console.warn("WARNING: DATABASE_URL is not set.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 });
  pool.on("error", (e) => console.error("pg pool error", e.message));
  run = async (t, p) => (await pool.query(t, p || [])).rows;
  execAll = (s) => pool.query(s);
}
const q = run;
const one = async (t, p) => (await run(t, p))[0];
module.exports = { q, one, exec: execAll };
