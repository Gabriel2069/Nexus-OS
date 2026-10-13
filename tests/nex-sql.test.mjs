import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import test from "node:test";
test("Postgres migration: quotas, RLS, memory deletion and idempotent confirmed action", async () => {
  const pg = new PGlite();
  await pg.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
  let core = readFileSync(
    "supabase/migrations/20260808223500_nexus_core.sql",
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await pg.exec(core);
  await pg.exec(
    readFileSync(
      "supabase/migrations/20261013142948_nex_intelligence.sql",
      "utf8",
    ),
  );
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  await pg.exec(`insert into auth.users values ('${a}'),('${b}');`);
  async function asUser(user) {
    await pg.exec(
      `reset role;set role authenticated;set request.jwt.claim.sub='${user}';`,
    );
  }
  await asUser(a);
  assert.equal(
    (await pg.query(`select public.nex_reserve('groq',2500) as ok`)).rows[0].ok,
    true,
  );
  assert.equal(
    (await pg.query(`select public.nex_reserve('groq',2500) as ok`)).rows[0].ok,
    true,
  );
  assert.equal(
    (await pg.query(`select public.nex_reserve('groq',2500) as ok`)).rows[0].ok,
    false,
  );
  await asUser(b);
  assert.equal(
    (await pg.query(`select public.nex_reserve('groq',100) as ok`)).rows[0].ok,
    false,
    "global quota cannot be bypassed by switching user",
  );
  await assert.rejects(pg.query("select * from nex_private.budget"));
  await asUser(a);
  await pg.exec(
    `insert into public.nex_memories(user_id,module,content) values ('${a}','geral','Perfil A');`,
  );
  const mid = (await pg.query("select id from public.nex_memories")).rows[0].id;
  await asUser(b);
  assert.equal(
    (await pg.query("select * from public.nex_memories")).rows.length,
    0,
  );
  await assert.rejects(
    pg.query(
      `insert into public.nex_memories(user_id,module,content) values ('${a}','geral','Ataque')`,
    ),
  );
  await asUser(a);
  await assert.rejects(
    pg.query(`update public.nex_memories set user_id='${b}' where id='${mid}'`),
  );
  await pg.exec(`delete from public.nex_memories where id='${mid}'`);
  assert.equal(
    (await pg.query("select * from public.nex_memories")).rows.length,
    0,
  );
  const action = "33333333-3333-4333-8333-333333333333";
  const call = `select public.nex_create_mission('${action}','mission','Teste confirmado') as id`;
  const first = (await pg.query(call)).rows[0].id;
  assert.equal((await pg.query(call)).rows[0].id, first);
  assert.equal(
    (await pg.query("select * from public.missions")).rows.length,
    1,
  );
  await assert.rejects(
    pg.query(
      `select public.nex_create_mission('${action}','mission','Outro título')`,
    ),
  );
  await asUser(b);
  assert.equal(
    (await pg.query("select * from public.missions")).rows.length,
    0,
  );
  await pg.exec("reset role;set role anon;");
  await assert.rejects(pg.query(`select public.nex_reserve('groq',1)`));
  await assert.rejects(pg.query("select * from public.nex_google_connections"));
  await pg.exec("reset role;truncate nex_private.budget;");
  await asUser(a);
  for (let i = 0; i < 25; i++) {
    await pg.exec(
      "reset role;update nex_private.budget set created_at=now()-interval '2 minutes';",
    );
    await asUser(a);
    assert.equal(
      (await pg.query(`select public.nex_reserve('google',1) as ok`)).rows[0]
        .ok,
      true,
    );
  }
  await pg.exec(
    "reset role;update nex_private.budget set created_at=now()-interval '2 minutes';",
  );
  await asUser(a);
  assert.equal(
    (await pg.query(`select public.nex_reserve('google',1) as ok`)).rows[0].ok,
    false,
  );
  await pg.close();
});
