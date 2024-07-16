import type { meta } from "./demo_server.ts";
import type { Query } from "./main.ts";
import { assert } from "jsr:@std/assert";

type QueryData = Query<typeof meta>; // it's same as `v.InferOutput<typeof valibotSchema(meta)>`

Deno.test("valid query data", async () => {
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

Deno.test("invalid query data", async () => {
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

Deno.test("all field unset", async () => {
    const res = await fetch("http://127.0.0.1:8000", {
        body: JSON.stringify({}),
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
    assert(res.status === 200);
    console.log(await res.json());
})
