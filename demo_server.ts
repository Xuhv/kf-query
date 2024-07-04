import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schemas from "./demo_schema.ts";
import { buildDbQuery, BuilderMeta, buildValibotSchema, NumberComparator, Query, StringComparator } from "./main.ts";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "jsr:@std/path";
import * as v from "@valibot/valibot";
import { mightFailSync } from "jsr:@might/fail";

const queryClient = postgres("postgres://postgres:postgres@localhost:5432/postgres");
const db = drizzle(queryClient, { schema: schemas });
await migrate(db, { migrationsFolder: resolve("drizzle") });

const c = (await db.execute(sql`SELECT COUNT(*) FROM ${schemas.users}`))[0].count;

if ((await db.execute(sql`SELECT COUNT(*) FROM ${schemas.users}`))[0].count === "0") {
    console.log(
        await db.insert(schemas.users).values([
            { name: "hello" },
            { name: "world" },
            { name: "foo" },
            { name: "bar" },
        ]).returning({ insertId: schemas.users.id }),
    );
}

export const meta = { // 用来生成查询表单校验 和 数据库查询
    id: { comparsion: { type: "number", comparator: NumberComparator.GT } },
    name: { comparsion: { type: "string", comparator: StringComparator.LIKE } },
} satisfies BuilderMeta;

const valibotSchema = buildValibotSchema(meta); // 用户校验

const createQuery = (input: Query<typeof meta>) => // 数据库查询
    buildDbQuery(meta)(
        input,
        db.select({ id: schemas.users.id, name: schemas.users.name }).from(schemas.users).$dynamic(),
        schemas.users,
    );

if (import.meta.main) {
    Deno.serve(async (req) => {
        const q = await req.json();
        const { result, error } = mightFailSync(() => v.parse(valibotSchema, q));
        if (!error) {
            const query = createQuery(result)
            console.log(new PgDialect().sqlToQuery(query.getSQL())); // 打印sql到控制台
            return new Response(JSON.stringify(await db.execute(query)));
        } else return new Response(JSON.stringify(error), { status: 400 });
    });
}
