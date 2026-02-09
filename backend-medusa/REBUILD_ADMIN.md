# How to Rebuild Admin Dashboard with MRP Changes

## Problem
The admin dashboard uses **pre-compiled code** from `node_modules/@medusajs/dashboard/dist/`. 
Our patches modify the **source code** in `src/`, but the compiled `dist/` folder hasn't been rebuilt.

## Solution: Rebuild Admin Dashboard

### Step 1: Stop Dev Server
Press `Ctrl+C` in the terminal where `npm run dev` is running.

### Step 2: Ensure Patch is Applied
```bash
npx patch-package @medusajs/dashboard
```

### Step 3: Rebuild Admin Dashboard
```bash
npm run build
```

This runs `medusa build` which will:
- Apply all patches
- Rebuild the admin dashboard from patched source code
- Output to `.medusa/server/public/admin`

### Step 4: Restart Dev Server
```bash
npm run dev
```

### Step 5: Hard Refresh Browser
- Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or clear browser cache

## Verification

After rebuild, check:
1. Navigate to: `http://localhost:9000/app/products/create`
2. Go to Tab 3 (Variants)
3. You should see:
   - ✅ Selling Price columns (with tax tooltip icons)
   - ✅ **MRP (Original Price) columns** beside Selling Price
   - ✅ Description text above grid

## Alternative: Quick Verification

Check if dist/ has MRP code:
```bash
# Should return True if rebuild worked
Select-String -Path "node_modules\@medusajs\dashboard\dist\product-create-C2VZ3AWG.mjs" -Pattern "mrp_currency" -Quiet
```

## Troubleshooting

### If build fails:
1. Clear build cache:
   ```bash
   Remove-Item -Recurse -Force .medusa -ErrorAction SilentlyContinue
   ```

2. Re-apply patch:
   ```bash
   npx patch-package @medusajs/dashboard
   ```

3. Try build again:
   ```bash
   npm run build
   ```

### If MRP still doesn't show:
1. Check browser console (F12) for errors
2. Verify patch file exists: `patches/@medusajs+dashboard+2.12.5.patch`
3. Verify source has MRP: Check `node_modules/@medusajs/dashboard/src/routes/products/product-create/components/product-create-variants-form/product-create-variants-form.tsx` for `mrp_currency`
4. Verify dist has MRP: Check `node_modules/@medusajs/dashboard/dist/product-create-C2VZ3AWG.mjs` for `mrp_currency`

## Why This Happens

Medusa v2 admin dashboard is:
- Pre-compiled in the npm package (`dist/` folder)
- Served from compiled code, not source
- Patches modify source, but compiled code needs rebuild
- `medusa build` rebuilds admin from patched source
