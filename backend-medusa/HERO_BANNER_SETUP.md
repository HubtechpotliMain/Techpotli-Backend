# Hero Banner Module - Setup Guide

## ✅ What's Been Created

### Backend Module
- ✅ `src/modules/hero-banner/` - Complete module with model, service, and exports
- ✅ Database schema defined (HeroBanner model)
- ✅ Service with CRUD + reorder methods
- ✅ Module registered in `medusa-config.ts`

### API Routes
- ✅ `GET /store/hero-banners` - Public endpoint for active banners
- ✅ `GET /admin/hero-banners` - List all banners
- ✅ `POST /admin/hero-banners` - Create banner
- ✅ `GET /admin/hero-banners/:id` - Get single banner
- ✅ `POST /admin/hero-banners/:id` - Update banner
- ✅ `DELETE /admin/hero-banners/:id` - Delete banner
- ✅ `POST /admin/hero-banners/:id/toggle` - Toggle active status
- ✅ `POST /admin/hero-banners/reorder` - Reorder banners
- ✅ `POST /admin/hero-banners/upload` - Upload image to R2

### Admin UI
- ✅ `src/admin/pages/hero-banners/index.tsx` - Full CRUD admin interface

### Frontend Integration
- ✅ Updated `getHeroBanners()` to use new Store API
- ✅ Removed dependency on collections for banners

## 🚀 Setup Steps

### 1. Generate Database Migration

```bash
cd Backend/backend-medusa
npx medusa db:generate hero-banner
```

This will create a migration file in your migrations directory.

### 2. Run Migration

```bash
npx medusa db:migrate
```

### 3. Restart Medusa Server

```bash
npm run dev
# or
npm start
```

### 4. Access Admin UI

1. Open Medusa Admin Panel (usually http://localhost:9000)
2. Navigate to "Hero Banners" in the sidebar
3. Start creating banners!

## 📝 Usage

### Create Banner via Admin UI
1. Click "Create Banner"
2. Enter title
3. Upload image (automatically uploaded to R2)
4. Set redirect URL (optional)
5. Set sort order
6. Toggle active status
7. Click "Create"

### Create Banner via API

```bash
curl -X POST http://localhost:9000/admin/hero-banners \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Summer Sale",
    "image_url": "https://your-r2-url.com/banner.jpg",
    "redirect_url": "/categories/summer",
    "is_active": true,
    "sort_order": 0
  }'
```

### Fetch Banners (Storefront)

The frontend automatically fetches from `/store/hero-banners` and displays them in the hero carousel.

## 🔧 Troubleshooting

### Migration Issues
- Ensure database is running
- Check `DATABASE_URL` in `.env`
- Run `npx medusa db:generate hero-banner` again if needed

### File Upload Issues
- Verify R2 credentials in `.env`:
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_ENDPOINT`
  - `R2_PUBLIC_URL`

### Admin UI Not Showing
- Check browser console for errors
- Verify module is registered in `medusa-config.ts`
- Restart Medusa server

## 📚 Architecture Notes

- **No Hardcoding**: All banners are stored in database
- **R2 Storage**: Images stored in Cloudflare R2, URLs in database
- **Dynamic**: Fully manageable from Admin Panel
- **Extensible**: Ready for scheduling, targeting, localization

## 🎯 Next Steps (Optional Enhancements)

1. Add scheduling (start_date, end_date)
2. Add geographic targeting
3. Add A/B testing
4. Add localization support
5. Add analytics tracking
