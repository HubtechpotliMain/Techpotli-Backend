import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260123082434 extends Migration {

  override async up(): Promise<void> {
    // Ensure table exists with the expected columns
    this.addSql(
      `create table if not exists "hero_banner" (
        "id" text not null,
        "title" text null,
        "image_url" text not null,
        "redirect_url" text null,
        "is_active" boolean not null default true,
        "sort_order" integer not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "hero_banner_pkey" primary key ("id")
      );`
    );

    // If the table already existed from a previous attempt without deleted_at,
    // add the column before creating the partial index that references it.
    this.addSql(
      `alter table if exists "hero_banner"
       add column if not exists "deleted_at" timestamptz null;`
    );

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_hero_banner_deleted_at"
       ON "hero_banner" ("deleted_at")
       WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hero_banner" cascade;`);
  }

}
