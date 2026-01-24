# Hero Banner Module

A production-grade, fully dynamic Hero Banner management system for MedusaJS.

## Features

- ✅ Full CRUD operations via Admin API
- ✅ Public Store API endpoint
- ✅ Cloudflare R2 image storage integration
- ✅ Drag & drop reordering
- ✅ Active/Inactive toggle
- ✅ Admin UI panel
- ✅ No hardcoded banners - fully dynamic

## Database Schema

- `id` (primary key)
- `title` (string)
- `image_url` (string) - Stored in Cloudflare R2
- `redirect_url` (string, nullable)
- `is_active` (boolean, default: true)
- `sort_order` (number, default: 0)
- `created_at` (datetime)
- `updated_at` (datetime)

## Setup

### 1. Generate Database Migration

```bash
cd Backend/backend-medusa
npx medusa db:generate hero-banner
```

### 2. Run Migration

```bash
npx medusa db:migrate
```

## API Endpoints

### Store API (Public)

- `GET /store/hero-banners` - Get all active banners (sorted by sort_order)

### Admin API

- `GET /admin/hero-banners` - List all banners
- `POST /admin/hero-banners` - Create banner
- `GET /admin/hero-banners/:id` - Get single banner
- `POST /admin/hero-banners/:id` - Update banner
- `DELETE /admin/hero-banners/:id` - Delete banner
- `POST /admin/hero-banners/:id/toggle` - Toggle active status
- `POST /admin/hero-banners/reorder` - Reorder banners
- `POST /admin/hero-banners/upload` - Upload image to R2

## Admin UI

Access the Hero Banners management page via:
- Admin Panel → Hero Banners (sidebar)

Features:
- List all banners with preview
- Create/Edit banners
- Upload images to R2
- Toggle active/inactive status
- Drag & drop reordering
- Delete banners

## Usage Example

### Create Banner (Admin)

```typescript
POST /admin/hero-banners
{
  "title": "Summer Sale",
  "image_url": "https://r2.example.com/banner.jpg",
  "redirect_url": "/categories/summer",
  "is_active": true,
  "sort_order": 0
}
```

### Fetch Active Banners (Storefront)

```typescript
GET /store/hero-banners
// Returns: { banners: [...], count: number }
```

## Architecture

- **Module**: `src/modules/hero-banner`
- **Service**: `HeroBannerService` - Business logic
- **Model**: `HeroBanner` - Database schema
- **APIs**: Admin & Store routes
- **Admin UI**: React component in admin panel

## Future Extensibility

The system is designed to be extended with:
- Scheduling (start/end dates)
- Targeting (geographic, user segments)
- Localization (multi-language banners)
- A/B testing
