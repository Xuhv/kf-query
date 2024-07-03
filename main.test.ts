import {
    BuilderMeta,
    buildValibotSchema,
    NumberComparator,
    Query,
    StringComparator,
} from "./main.ts";
import * as v from "@valibot/valibot";

enum ABC {
    A,
    B,
    C
}

enum ABC_STRING {
    A = "A",
    B = "B",
    C = "C"
}

const meta = {
    name: {
        comparsion: {
            type: "string",
            comparator: StringComparator.LIKE,
        },
        optional: true,
    },
    age: {
        comparsion: {
            type: "number",
            comparator: NumberComparator.EQUAL,
        },
    },
    abc: {
        comparsion: {
            type: ABC_STRING,
            comparator: StringComparator.EQUAL,
        },
    },
    abc2: {
        comparsion: {
            type: ABC,
            comparator: NumberComparator.EQUAL,
        },
    },
} satisfies BuilderMeta;

type T = Query<typeof meta>;

const x = buildValibotSchema(meta);
type X = v.InferOutput<typeof x>;

const d: T = {
    abc: ABC_STRING.B,
    abc2: ABC.A,
    age: 1,
}

Deno.test("1", () => {
    v.parse(x, {});
});
Deno.test("2", () => {
    v.parse(x, { name: "hello" });
});
Deno.test("3", () => {
    v.parse(x, { age: 1 });
});
