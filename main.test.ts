import { type BuilderMeta, buildValibotSchema, NumberComparator, type Query, StringComparator } from "./main.ts";
import * as v from "@valibot/valibot";
import { assertThrows } from "jsr:@std/assert";

enum ABC {
    A,
    B,
    C,
}

enum ABC_STRING {
    A = "A",
    B = "B",
    C = "C",
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
        optional: true,
    },
    abc2: {
        comparsion: {
            type: ABC,
            comparator: NumberComparator.EQUAL,
        },
        optional: true,
    },
} satisfies BuilderMeta;

type VoTypeFromQuery = Query<typeof meta>;

const x = buildValibotSchema(meta);
type VoTypeFromValibotSchema = v.InferOutput<typeof x>;

export const t: VoTypeFromQuery extends VoTypeFromValibotSchema
    ? VoTypeFromValibotSchema extends VoTypeFromQuery ? true : false
    : false = true;

Deno.test("1", () => {
    assertThrows(() => v.parse(x, {}));
    assertThrows(() => v.parse(x, { name: "hello" }));
    assertThrows(() => v.parse(x, { name: "hello", abc: ABC_STRING.A, abc2: ABC.B }));
    assertThrows(() => v.parse(x, { name: "hello", abc: ABC.A, abc2: ABC_STRING.B, age: 29 }));
    v.parse(x, { name: "hello", abc: ABC_STRING.A, abc2: ABC.B, age: 29 });
    v.parse(x, { age: 29 });
});
