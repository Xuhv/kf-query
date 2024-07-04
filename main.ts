import * as v from "@valibot/valibot";
import type { PgColumn, PgSelectQueryBuilder } from "drizzle-orm/pg-core";
import { type SQL, sql } from "drizzle-orm";

type BoolComparator = Comparator.EQUAL | Comparator.NOT_EQUAL;
type StringComparator = Comparator.EQUAL | Comparator.NOT_EQUAL | Comparator.LIKE;
type NumberComparator =
    | Comparator.EQUAL
    | Comparator.NOT_EQUAL
    | Comparator.LT
    | Comparator.LTE
    | Comparator.GT
    | Comparator.GTE;
type DatetimeComparator =
    | Comparator.EQUAL
    | Comparator.NOT_EQUAL
    | Comparator.LT
    | Comparator.LTE
    | Comparator.GT
    | Comparator.GTE;
type ArrayComparator = Comparator.ARRAY_INCLUDED | Comparator.ARRAY_NOT_INCLUDED;
type IntervalComparator =
    | Comparator.INTERVAL_LEFT_INCLUDED
    | Comparator.INTERVAL_RIGHT_INCLUDED
    | Comparator.INTERVAL_BOTH_INCLUDED
    | Comparator.INTERVAL_BOTH_EXCLUDED;

export enum Comparator {
    /** string, number, date */
    EQUAL,
    /** string, number, date */
    NOT_EQUAL,
    /** string, number, date */
    LT,
    /** string, number, date */
    LTE,
    /** string, number, date */
    GT,
    /** string, number, date */
    GTE,

    /** string */
    LIKE,

    /** array */
    ARRAY_INCLUDED,
    /** array */
    ARRAY_NOT_INCLUDED,

    /** interval */
    INTERVAL_LEFT_INCLUDED,
    /** interval */
    INTERVAL_RIGHT_INCLUDED,
    /** interval */
    INTERVAL_BOTH_INCLUDED,
    /** interval */
    INTERVAL_BOTH_EXCLUDED,
}

/**
 * x in (start, end) or [start, end]
 */
export type Interval<T extends number | Date = number | Date> = { start: T; end: T };

type Comparison_String = { type: "string"; comparator: StringComparator };
type Comparison_Number = { type: "number"; comparator: NumberComparator };
type Comparison_Enum<T extends v.Enum = v.Enum> = { type: T; comparator: Comparator.EQUAL };
type Comparison_Bool = { type: "boolean"; comparator: BoolComparator };
type Comparison_Datetime = { type: "datetime"; comparator: DatetimeComparator };
type Comparison_Array = { type: "array"; itemType: "string" | "number"; comparator: ArrayComparator };
type Comparison_Interval = { type: "interval"; itemType: "number" | "datetime"; comparator: IntervalComparator };

/**
 * indicate the field type and how to compare data in the query
 */
export type Comparsion<T extends v.Enum = v.Enum> =
    | Comparison_String
    | Comparison_Number
    | Comparison_Enum<T>
    | Comparison_Bool
    | Comparison_Datetime
    | Comparison_Array
    | Comparison_Interval;

export type BuilderMeta = {
    [k: string]: {
        /** indicate the field type and how to compare data in the query */
        comparison: Comparsion;
        /**
         * indicate if the field is optional or required
         * @default false
         */
        optional?: boolean;
    };
};

type FieldDataType<T extends BuilderMeta, K extends keyof T> = T[K]["comparison"]["type"];

type FiledOptionalKey<T extends BuilderMeta, K extends keyof T> = {
    [k in keyof T]: T[k]["optional"] extends true ? k : never;
}[K];

type ApplyOptional<T, K extends keyof T> =
    & Omit<T, K>
    & Partial<Pick<T, K>>;

type Prettier<T> = T extends infer R ? { [k in keyof R]: R[k] } : never;

type EnumValue<T extends v.Enum> = T[keyof T] extends infer I ? I : never;

/**
 * get input data type from {@link BuilderMeta}
 */
export type Query<T extends BuilderMeta> = Prettier<
    ApplyOptional<
        {
            [k in keyof T]: FieldDataType<T, k> extends "string" ? string
                : FieldDataType<T, k> extends "number" ? number
                : FieldDataType<T, k> extends "datetime" ? Date
                : FieldDataType<T, k> extends "boolean" ? boolean
                : FieldDataType<T, k> extends "array"
                    ? T[k]["comparison"] extends (infer T1 extends Comparison_Array)
                        ? (T1["itemType"] extends "number" ? number : string)[]
                    : never
                : FieldDataType<T, k> extends "interval"
                    ? T[k]["comparison"] extends (infer T1 extends Comparison_Interval)
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
        : FieldDataType<T, k> extends "boolean" ? v.BooleanSchema<undefined>
        : FieldDataType<T, k> extends "array" ? v.ArraySchema<
                T[k]["comparison"] extends (infer T1 extends Comparison_Array)
                    ? T1["itemType"] extends "number" ? v.NumberSchema<undefined> : v.StringSchema<undefined>
                    : never,
                undefined
            >
        : FieldDataType<T, k> extends v.Enum ? v.EnumSchema<FieldDataType<T, k>, undefined>
        : FieldDataType<T, k> extends "interval"
            ? T[k]["comparison"] extends (infer T1 extends Comparison_Interval)
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

/**
 * build a {@link PgSelectQueryBuilder} from query
 */
export type DbQueryBuilder<T extends BuilderMeta> = <T1 extends PgSelectQueryBuilder>(
    query: Query<T>,
    /**
     * @see {@link https://orm.drizzle.team/docs/dynamic-query-building}
     */
    qb: T1,
    /**
     * map {@link query}'s key to PgColumn
     * @example
     * { uid: users.id, docName: docs.name }
     */
    schemas: Record<keyof T, PgColumn>,
) => PgSelectQueryBuilder;

/**
 * build a valibot schema which has the same output type with {@link Query}
 */
export function valibotSchema<T extends BuilderMeta>(
    meta: T,
): ValibotSchema<T> {
    const o = {};

    for (const key in meta) {
        const { comparison, optional } = meta[key];
        let s;
        if (typeof comparison.type === "object") {
            s = v.enum(comparison.type);
        } else if (comparison.type === "string") {
            s = v.string();
        } else if (comparison.type === "number") {
            s = v.number();
        } else if (comparison.type === "datetime") {
            s = v.date();
        } else if (comparison.type === "array") {
            s = v.array(comparison.itemType === "number" ? v.number() : v.string());
        } else if (comparison.type === "interval") {
            s = v.object({
                start: comparison.itemType === "number" ? v.number() : v.date(),
                end: comparison.itemType === "number" ? v.number() : v.date(),
            });
        } else if (comparison.type === "boolean") {
            s = v.boolean();
        } else throw new Error("unknown comparsion type");

        if (optional) s = v.optional(s);

        // @ts-expect-error:
        o[key] = s;
    }

    return v.object(o) as unknown as ValibotSchema<T>;
}

/**
 * @returns build a db query from input data typed {@link Query}
 */
export function dbQueryBuilderFactory<T extends BuilderMeta>(
    meta: T,
): DbQueryBuilder<T> {
    return <T1 extends PgSelectQueryBuilder>(
        query: Query<T>,
        qb: T1,
        schemas: Record<keyof T, PgColumn>,
    ): PgSelectQueryBuilder => {
        const statements: SQL[] = [];

        for (const k in query) {
            const { comparison } = meta[k];
            const exp = query[k];
            const key = schemas[k];
            switch (comparison.comparator) {
                case Comparator.LIKE:
                    statements.push(sql`${key} LIKE ${exp}`);
                    break;
                case Comparator.EQUAL:
                    statements.push(sql`${key} = ${exp}`);
                    break;
                case Comparator.NOT_EQUAL:
                    statements.push(sql`${key} != ${exp}`);
                    break;
                case Comparator.LT:
                    statements.push(sql`${key} < ${exp}`);
                    break;
                case Comparator.LTE:
                    statements.push(sql`${key} <= ${exp}`);
                    break;
                case Comparator.GT:
                    statements.push(sql`${key} > ${exp}`);
                    break;
                case Comparator.GTE:
                    statements.push(sql`${key} >= ${exp}`);
                    break;
                case Comparator.ARRAY_INCLUDED:
                    statements.push(sql`${key} = ANY(${exp})`);
                    break;
                case Comparator.ARRAY_NOT_INCLUDED:
                    statements.push(sql`${key} != ALL(${exp})`);
                    break;
                case Comparator.INTERVAL_LEFT_INCLUDED:
                    statements.push(sql`${key} >= ${(exp as Interval).start} AND ${key} < ${(exp as Interval).end}`);
                    break;
                case Comparator.INTERVAL_RIGHT_INCLUDED:
                    statements.push(sql`${key} > ${(exp as Interval).start} AND ${key} <= ${(exp as Interval).end}`);
                    break;
                case Comparator.INTERVAL_BOTH_INCLUDED:
                    statements.push(sql`${key} >= ${(exp as Interval).start} AND ${key} <= ${(exp as Interval).end}`);
                    break;
                case Comparator.INTERVAL_BOTH_EXCLUDED:
                    statements.push(sql`${key} > ${(exp as Interval).start} AND ${key} < ${(exp as Interval).end}`);
                    break;
                default:
                    throw new Error("unknown comparsion type");
            }
        }

        return qb.where(sql.join(statements, sql.raw(" AND ")));
    };
}
