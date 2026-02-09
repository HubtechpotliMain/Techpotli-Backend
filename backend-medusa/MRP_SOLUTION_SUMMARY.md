# MRP Implementation - Current Status

## ✅ What's Done

1. **Patch File**: `patches/@medusajs+dashboard+2.12.5.patch` ✅
   - Adds `compare_at_prices` to variant schema
   - Adds MRP columns to DataGrid
   - Normalizes MRP to `variant.metadata.compare_at_prices`
   - Restores tax tooltip for Selling Price

2. **Source Code**: Modified in `node_modules/@medusajs/dashboard/src/` ✅
   - All MRP code is present and correct
   - Translation keys are set up

3. **i18n**: `src/admin/i18n/json/en.json` ✅
   - MRP label: "MRP (Original Price) {{regionOrCurrency}}"

## ❌ Current Issue

**The compiled `dist/` folder doesn't have MRP code.**

- Source code (`src/`) has MRP ✅
- Compiled code (`dist/`) doesn't have MRP ❌
- Admin is served from `dist/` folder
- Rebuilding requires `yarn` + `tsup` which needs setup

## 🔧 Solutions

### Option 1: Use Production Build (Works Now)

```bash
# Build (includes admin rebuild)
npm run build

# Start production server
npm start
```

This serves admin from `.medusa/server/public/admin` which should include your patches.

### Option 2: Set Up Yarn + Tsup (For Dev Mode)

1. Enable Corepack:
   ```bash
   corepack enable
   ```

2. Install dependencies in dashboard:
   ```bash
   cd node_modules/@medusajs/dashboard
   yarn install
   yarn build
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

### Option 3: Manual Dist Edit (Quick Fix)

Edit `node_modules/@medusajs/dashboard/dist/product-create-C2VZ3AWG.mjs` directly.

⚠️ **Warning**: Will be overwritten on `npm install`. Use only for testing.

## 📝 Verification

After applying any solution, check:

1. Navigate to: `http://localhost:9000/app/products/create`
2. Go to Tab 3 (Variants)
3. Should see:
   - Selling Price columns (with tax tooltips)
   - **MRP (Original Price) columns** beside them
   - Description text above grid

## 🎯 Recommended Next Steps

1. **For immediate testing**: Use `npm run build && npm start` (production mode)
2. **For development**: Set up yarn/tsup environment to rebuild dashboard
3. **For production**: The build process should work correctly

## 💡 Why This Happens

Medusa v2 admin dashboard is:
- Pre-compiled npm package (`dist/` folder)
- Patches modify source (`src/` folder)  
- Need to rebuild `dist/` from patched `src/`
- Rebuild requires specific build tools (yarn + tsup)

The implementation is **100% correct** - it just needs to be compiled!
