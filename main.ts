import * as v from "@valibot/valibot";
import type { PgColumn, PgSelectQueryBuilder } from "drizzle-orm/pg-core";
import { type SQL, sql } from "drizzle-orm";

export enum StringComparator {
    LIKE,
    EQUAL,
    NOT_EQUAL,
}

export enum NumberComparator {
    LT,
    LTE,
    GT,
    GTE,
    EQUAL,
    NOT_EQUAL,
}

export enum ArrayComparator {
    INCLUDED,
    NOT_INCLUDED,
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

export type Interval<T extends number | Date = number | Date> = { start: T; end: T };

type Comparison_String = { type: "string"; comparator: StringComparator };

type Comparison_Number = { type: "number"; comparator: NumberComparator };
type Comparison_Enum<T extends v.Enum = v.Enum> = {
    type: T;
    comparator: StringComparator.EQUAL | NumberComparator.EQUAL;
};

type Comparison_Datetime = { type: "datetime"; comparator: DatetimeComparator };
type Comparison_Array = { type: "array"; itemType: "string" | "number"; comparator: ArrayComparator };
type Comparison_Interval = { type: "interval"; itemType: "number" | "datetime"; comparator: IntervalComparator };

export type Comparsion<T extends v.Enum = v.Enum> =
    | Comparison_String
    | Comparison_Number
    | Comparison_Enum<T>
    | Comparison_Datetime
    | Comparison_Array
    | Comparison_Interval;

export type BuilderMeta = { [k: string]: { comparsion: Comparsion; optional?: boolean } };

type FieldDataType<T extends BuilderMeta, K extends keyof T> = T[K]["comparsion"]["type"];

type FiledOptionalKey<T extends BuilderMeta, K extends keyof T> = {
    [k in keyof T]: T[k]["optional"] extends true ? k : never;
}[K];

type ApplyOptional<T, K extends keyof T> =
    & Omit<T, K>
    & Partial<Pick<T, K>>;

type Prettier<T> = T extends infer R ? { [k in keyof R]: R[k] } : never;

type EnumValue<T extends v.Enum> = T[keyof T] extends infer I ? I : never;

export type Query<T extends BuilderMeta> = Prettier<
    ApplyOptional<
        {
            [k in keyof T]: FieldDataType<T, k> extends "string" ? string
                : FieldDataType<T, k> extends "number" ? number
                : FieldDataType<T, k> extends "datetime" ? number
                : FieldDataType<T, k> extends "array"
                    ? T[k]["comparsion"] extends (infer T1 extends Comparison_Array)
                        ? (T1["itemType"] extends "number" ? number : string)[]
                    : never
                : FieldDataType<T, k> extends "interval"
                    ? T[k]["comparsion"] extends (infer T1 extends Comparison_Interval)
                        ? Interval<T1["itemType"] extends "number" ? number : Date>
                    : never
                : FieldDataType<T, k> extends v.Enum ? EnumValue<FieldDataType<T, k>>
                : never;
        },
        FiledOptionalKey<T, keyof T>
    >
>;

type ValibotEntries<T extends BuilderMeta> = {
    [k in keyof T]: FieldDataType<T, k> extends "string" ? v.StringSchema<undefined>
        : FieldDataType<T, k> extends "number" ? v.NumberSchema<undefined>
        : FieldDataType<T, k> extends "datetime" ? v.NumberSchema<undefined>
        : FieldDataType<T, k> extends "array" ? v.ArraySchema<
                T[k]["comparsion"] extends (infer T1 extends Comparison_Array)
                    ? T1["itemType"] extends "number" ? v.NumberSchema<undefined> : v.StringSchema<undefined>
                    : never,
                undefined
            >
        : FieldDataType<T, k> extends v.Enum ? v.EnumSchema<FieldDataType<T, k>, undefined>
        : FieldDataType<T, k> extends "interval"
            ? T[k]["comparsion"] extends (infer T1 extends Comparison_Interval)
                ? T1["itemType"] extends "number"
                    ? v.ObjectSchema<{ start: v.NumberSchema<undefined>; end: v.NumberSchema<undefined> }, undefined>
                : v.ObjectSchema<{ start: v.DateSchema<undefined>; end: v.DateSchema<undefined> }, undefined>
            : never
        : never;
};

type ApplyOptionalOnEntries<
    T extends BuilderMeta,
    K extends keyof T,
    Entries extends ValibotEntries<T> = ValibotEntries<T>,
> =
    & Omit<Entries, K>
    & { [k in K]: v.OptionalSchema<Entries[k], undefined> };

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
            s = v.array(comparsion.itemType === "number" ? v.number() : v.string());
        } else if (comparsion.type === "interval") {
            s = v.object({
                start: comparsion.itemType === "number" ? v.number() : v.date(),
                end: comparsion.itemType === "number" ? v.number() : v.date(),
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

export function buildDbQuery<T extends BuilderMeta>(
    meta: T,
): <T1 extends PgSelectQueryBuilder>(
    query: Query<T>,
    qb: T1,
    schemas: Record<keyof T, PgColumn>,
) => PgSelectQueryBuilder {
    return <T1 extends PgSelectQueryBuilder>(
        query: Query<T>,
        qb: T1,
        schemas: Record<keyof T, PgColumn>,
    ): PgSelectQueryBuilder => {
        const statements: SQL[] = [];

        for (const k in query) {
            const { comparsion } = meta[k];
            const exp = query[k];
            const key = schemas[k];
            switch (comparsion.comparator) {
                case StringComparator.LIKE:
                    statements.push(sql`${key} LIKE ${exp}`);
                    break;
                case StringComparator.EQUAL:
                case NumberComparator.EQUAL:
                    statements.push(sql`${key} = ${exp}`);
                    break;
                case StringComparator.NOT_EQUAL:
                case NumberComparator.NOT_EQUAL:
                    statements.push(sql`${key} != ${exp}`);
                    break;
                case NumberComparator.LT:
                    statements.push(sql`${key} < ${exp}`);
                    break;
                case NumberComparator.LTE:
                    statements.push(sql`${key} <= ${exp}`);
                    break;
                case NumberComparator.GT:
                    statements.push(sql`${key} > ${exp}`);
                    break;
                case NumberComparator.GTE:
                    statements.push(sql`${key} >= ${exp}`);
                    break;
                case DatetimeComparator.BEFORE:
                    statements.push(sql`${key} < ${exp}`);
                    break;
                case DatetimeComparator.AFTER:
                    statements.push(sql`${key} > ${exp}`);
                    break;
                case DatetimeComparator.EQUAL:
                    statements.push(sql`${key} = ${exp}`);
                    break;
                case ArrayComparator.INCLUDED:
                    statements.push(sql`${key} = ANY(${exp})`);
                    break;
                case ArrayComparator.NOT_INCLUDED:
                    statements.push(sql`${key} != ALL(${exp})`);
                    break;
                case IntervalComparator.LEFT_INCLUDED:
                    statements.push(sql`${key} >= ${(exp as Interval).start} AND ${key} < ${(exp as Interval).end}`);
                    break;
                case IntervalComparator.RIGHT_INCLUDED:
                    statements.push(sql`${key} > ${(exp as Interval).start} AND ${key} <= ${(exp as Interval).end}`);
                    break;
                case IntervalComparator.BOTH_INCLUDED:
                    statements.push(sql`${key} >= ${(exp as Interval).start} AND ${key} <= ${(exp as Interval).end}`);
                    break;
                default:
                    throw new Error("unknown comparsion type");
            }
        }

        return qb.where(sql.join(statements, sql.raw(" AND ")));
    };
}
