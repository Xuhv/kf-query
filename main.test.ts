import { type BuilderMeta, Comparator, type Query, valibotSchema } from "./main.ts";
import * as v from "@valibot/valibot";
import { assertThrows } from "jsr:@std/assert";

Deno.test("string", () => {
    const meta = {
        string: { comparison: { type: "string", comparator: Comparator.EQUAL } },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { string: "a" };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { string: 1 }));
});

Deno.test("number", () => {
    const meta = {
        number: { comparison: { type: "number", comparator: Comparator.EQUAL } },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { number: 1 };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { number: "a" }));
});

Deno.test("enum", () => {
    enum STRING_ENUM {
        A = "A",
        B = "B",
    }
    const meta = {
        enum: { comparison: { type: STRING_ENUM, comparator: Comparator.EQUAL } },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { enum: STRING_ENUM.A };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { enum: "C" }));
});

Deno.test("datetime", () => {
    const meta = {
        datetime: { comparison: { type: "datetime", comparator: Comparator.EQUAL } },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { datetime: new Date() };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { datetime: "a" }));
});

Deno.test("boolean", () => {
    const meta = {
        boolean: { comparison: { type: "boolean", comparator: Comparator.EQUAL } },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { boolean: true };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { boolean: "a" }));
});

Deno.test("string array", () => {
    const meta = {
        array: { comparison: { type: "array", comparator: Comparator.ARRAY_INCLUDED, itemType: "string" } },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { array: ["a"] };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { array: [1] }));
});

Deno.test("number array", () => {
    const meta = {
        array: { comparison: { type: "array", comparator: Comparator.ARRAY_INCLUDED, itemType: "number" } },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { array: [1] };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { array: ["a"] }));
});

Deno.test("number interval", () => {
    const meta = {
        interval: {
            comparison: { type: "interval", comparator: Comparator.INTERVAL_BOTH_INCLUDED, itemType: "number" },
        },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { interval: { start: 1, end: 2 } };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { interval: { start: "a", end: "b" } }));
});

Deno.test("date interval", () => {
    const meta = {
        interval: {
            comparison: { type: "interval", comparator: Comparator.INTERVAL_BOTH_INCLUDED, itemType: "datetime" },
        },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { interval: { start: new Date(), end: new Date() } };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { interval: { start: "a", end: "b" } }));
});

Deno.test("optional", () => {
    const meta = {
        string: { comparison: { type: "string", comparator: Comparator.EQUAL }, optional: true },
    } satisfies BuilderMeta;
    const schema = valibotSchema(meta);
    const query: Query<typeof meta> = { string: "a" };
    v.parse(schema, query);
    assertThrows(() => v.parse(schema, { string: 1 }));
});
