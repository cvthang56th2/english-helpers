import {
  boolean,
  integer,
  pgSchema,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Managed by Neon Auth (Better Auth). Enable Auth in Neon Console first. */
export const neonAuth = pgSchema("neon_auth");

export const userInNeonAuth = neonAuth.table(
  "user",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull(),
    image: text(),
    createdAt: timestamp({ withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    role: text(),
    banned: boolean(),
    banReason: text(),
    banExpires: timestamp({ withTimezone: true, mode: "string" }),
  },
  (table) => [unique("user_email_key").on(table.email)]
);

export const words = pgTable(
  "words",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => userInNeonAuth.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    sourceLang: text("source_lang").$type<"en" | "vi">().notNull(),
    targetLang: text("target_lang").$type<"en" | "vi">().notNull(),
    translation: text("translation").notNull(),
    ipa: text("ipa"),
    audioUsUrl: text("audio_us_url"),
    audioUkUrl: text("audio_uk_url"),
    partOfSpeech: text("part_of_speech"),
    definition: text("definition"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("words_user_term_source_uidx").on(
      t.userId,
      t.term,
      t.sourceLang
    ),
  ]
);

export type WordRow = typeof words.$inferSelect;

/** API / UI shape (snake_case) */
export function wordToRecord(row: WordRow) {
  return {
    id: row.id,
    user_id: row.userId,
    term: row.term,
    source_lang: row.sourceLang,
    target_lang: row.targetLang,
    translation: row.translation,
    ipa: row.ipa,
    audio_us_url: row.audioUsUrl,
    audio_uk_url: row.audioUkUrl,
    part_of_speech: row.partOfSpeech,
    definition: row.definition,
    position: row.position,
    created_at:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    updated_at:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : String(row.updatedAt),
  };
}
