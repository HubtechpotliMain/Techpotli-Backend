import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Creates the hero_banner table for the hero-banner module.
 *
 * Notes:
 * - Stores ONLY the R2 URL in `image_url`.
 * - `title` and `redirect_url` are optional.
 * - `is_active` + `sort_order` enable publish + ordering without code changes.
 */
export class Migration202601231430 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "hero_banner" (
        "id" text not null,
        "title" text null,
        "image_url" text not null,
        "redirect_url" text null,
        "is_active" boolean not null default true,
        "sort_order" integer not null default 0,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        constraint "hero_banner_pkey" primary key ("id")
      );
    `)

    this.addSql(`create index if not exists "IDX_hero_banner_is_active" on "hero_banner" ("is_active");`)
    this.addSql(`create index if not exists "IDX_hero_banner_sort_order" on "hero_banner" ("sort_order");`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "hero_banner" cascade;`)
  }
}

