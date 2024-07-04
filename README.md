# @kf/query

## example

The full example is available in github repository.

```ts
// demo_server.ts
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
```

```ts
// demo_client.ts
type QueryData = Query<typeof meta>; // it's same as `v.InferOutput<typeof valibotSchema(meta)>`

Deno.test("1", async () => {
    const res = await fetch("http://127.0.0.1:8000", {
        body: JSON.stringify({ id: 1, name: "%o%" } satisfies QueryData),
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
    assert(res.status === 200);
    console.log(await res.json());
})

Deno.test("2", async () => {
    const res = await fetch("http://127.0.0.1:8000", {
        body: JSON.stringify({ id: "1", name: "%o%" }), // invalid
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
    assert(res.status === 400);
    console.log(await res.json());
})
```
