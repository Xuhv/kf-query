import { meta } from "./demo_server.ts";
import { Query } from "./main.ts";
import { assert } from "jsr:@std/assert";

type QueryData = Query<typeof meta>; // 用户输入类型

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
        body: JSON.stringify({ id: "1", name: "%o%" }), // 错误的类型
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
    });
    assert(res.status === 400);
    console.log(await res.json());
})
