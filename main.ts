import * as v from "@valibot/valibot";
import { PgSelectQueryBuilder, QueryBuilder } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export enum StringComparator {
    LIKE,
    EQUAL,
}

export enum NumberComparator {
    LT,
    LTE,
    GT,
    GTE,
    EQUAL,
}

export enum ArrayComparator {
    INTERSECTION,
    SUBSET,
    SUPERSET,
    EQUAL,
}

export enum DatetimeComparator {
    BEFORE,
    AFTER,
    EQUAL,
}

export enum IntervalComparator {
    LEFT_INCLUDED,
    RIGHT_INCLUDED,
    BOTH_INCLUDED,
}

export type Interval = { start: number; end: number };

// export type Enum<E> = Record<keyof E, number | string> & {
//     [k: number]: string;
// };

export type Comparsion<T extends v.Enum = v.Enum> =
    | { type: "string"; comparator: StringComparator }
    | { type: "number"; comparator: NumberComparator }
    | { type: T; comparator: StringComparator.EQUAL | NumberComparator.EQUAL }
    | { type: "datetime"; comparator: DatetimeComparator }
    | { type: "array"; comparator: ArrayComparator }
    | { type: "interval"; comparator: IntervalComparator };

export type BuilderMeta = {
    [k: string]: {
        comparsion: Comparsion;
        optional?: boolean;
    };
};

// 1. a class has comparsion meta
// 2. use it to generate query and valibot schema

export type FieldDataType<T extends BuilderMeta, K extends keyof T> =
    T[K]["comparsion"]["type"];

export type FiledOptionalKey<T extends BuilderMeta, K extends keyof T> = {
    [k in keyof T]: T[k]["optional"] extends true ? k : never;
}[K];

export type ApplyOptional<T, K extends keyof T> =
    & Omit<T, K>
    & Partial<Pick<T, K>>;

export type Prettier<T> = T extends infer R ? { [k in keyof R]: R[k] } : never;

type EnumValue<T extends v.Enum> = T[keyof T] extends infer I ? I : never;

export type Query<T extends BuilderMeta> = Prettier<
    ApplyOptional<
        {
            [k in keyof T]: FieldDataType<T, k> extends "string" ? string
                : FieldDataType<T, k> extends "number" ? number
                : FieldDataType<T, k> extends "datetime" ? number
                : FieldDataType<T, k> extends "array" ? any[]
                : FieldDataType<T, k> extends "interval" ? Interval
                : FieldDataType<T, k> extends v.Enum
                    ? EnumValue<FieldDataType<T, k>>
                : never;
        },
        FiledOptionalKey<T, keyof T>
    >
>;

type ValibotEntries<T extends BuilderMeta> = {
    [k in keyof T]: FieldDataType<T, k> extends "string" | string[]
        ? v.StringSchema<undefined>
        : FieldDataType<T, k> extends "number" | number[]
            ? v.NumberSchema<undefined>
        : FieldDataType<T, k> extends "datetime" ? v.NumberSchema<undefined>
        : FieldDataType<T, k> extends "array"
            ? v.ArraySchema<v.AnySchema, undefined>
        : FieldDataType<T, k> extends "interval" ? v.ObjectSchema<{
                start: v.NumberSchema<undefined>;
                end: v.NumberSchema<undefined>;
            }, undefined>
        : FieldDataType<T, k> extends v.Enum
            ? FieldDataType<T, k> extends infer U
                // @ts-expect-error:
                ? v.EnumSchema<U, undefined>
            : never
        : never;
};

type ApplyOptionalOnEntries<
    T extends BuilderMeta,
    K extends keyof T,
    Entries extends ValibotEntries<T> = ValibotEntries<T>,
> =
    & Omit<Entries, K>
    & { [k in K]: v.OptionalSchema<Entries[K], undefined> };

type ValibotSchema<T extends BuilderMeta> = v.ObjectSchema<
    ApplyOptionalOnEntries<T, FiledOptionalKey<T, keyof T>>,
    undefined
>;

export function buildValibotSchema<T extends BuilderMeta>(
    meta: T,
): ValibotSchema<T> {
    const o = {};

    for (const key in meta) {
        const { comparsion, optional } = meta[key];
        let s;
        if (typeof comparsion.type === "object") {
            s = v.enum(comparsion.type);
        } else if (comparsion.type === "string") {
            s = v.string();
        } else if (comparsion.type === "number") {
            s = v.number();
        } else if (comparsion.type === "datetime") {
            s = v.number();
        } else if (comparsion.type === "array") {
            s = v.array(v.any());
        } else if (comparsion.type === "interval") {
            s = v.object({
                start: v.number(),
                end: v.number(),
            });
        } else throw new Error("unknown comparsion type");

        if (optional) {
            s = v.optional(s);
        }

        // @ts-expect-error:
        o[key] = s;
    }

    return v.object(o) as unknown as ValibotSchema<T>;
}