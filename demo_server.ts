import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import * as schemas from "./demo_schema.ts";
import { dbQueryBuilderFactory, type BuilderMeta, valibotSchema, type Query, Comparator } from "./main.ts";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { resolve } from "jsr:@std/path";
import * as v from "@valibot/valibot";
import { mightFailSync } from "jsr:@might/fail";

const queryClient = postgres("postgres://postgres:postgres@localhost:5432/postgres");
const db = drizzle(queryClient, { schema: schemas });
await migrate(db, { migrationsFolder: resolve("drizzle") });

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

export const meta = { // the metadata to build valibot schema and db query
    id: { comparison: { type: "number", comparator: Comparator.GT } },
    name: { comparison: { type: "string", comparator: Comparator.LIKE } },
} satisfies BuilderMeta;

const schema = valibotSchema(meta); // valibot schema

const createQuery = (input: Query<typeof meta>) => // build db query
    dbQueryBuilderFactory(meta)(
        input,
        db.select({ id: schemas.users.id, name: schemas.users.name }).from(schemas.users).$dynamic(),
        schemas.users,
    );

if (import.meta.main) {
    Deno.serve(async (req) => {
        const q = await req.json();
        const { result, error } = mightFailSync(() => v.parse(schema, q));
        if (!error) { // if input is invalid, return 400
            const query = createQuery(result)
            console.log(new PgDialect().sqlToQuery(query.getSQL()));
            return new Response(JSON.stringify(await db.execute(query)));
        } else return new Response(JSON.stringify(error), { status: 400 });
    });
}
