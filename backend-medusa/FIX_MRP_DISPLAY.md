# Fix MRP Columns Not Showing

## Root Cause
The admin dashboard is served from **pre-compiled code** in `node_modules/@medusajs/dashboard/dist/`. 
Our patches modify **source code** in `src/`, but the `dist/` folder hasn't been rebuilt because:
- Dashboard requires `yarn` and `tsup` to build
- `medusa build` copies pre-compiled admin, doesn't rebuild from source
- In dev mode, admin might still be served from `dist/` folder

## Solution Options

### Option 1: Install Yarn and Rebuild Dashboard (Recommended)

1. **Install Yarn globally**:
   ```bash
   npm install -g yarn
   ```

2. **Rebuild dashboard package**:
   ```bash
   cd node_modules/@medusajs/dashboard
   yarn install
   yarn build
   cd ../../..
   ```

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

### Option 2: Use Production Build (Works but slower)

1. **Build for production**:
   ```bash
   npm run build
   ```

2. **Start production server**:
   ```bash
   npm start
   ```

   This serves admin from `.medusa/server/public/admin` which includes your patches.

### Option 3: Manual Dist File Edit (Quick Fix)

If you need immediate results, manually edit the compiled file:

1. **Find the product-create file in dist**:
   ```bash
   # File: node_modules/@medusajs/dashboard/dist/product-create-C2VZ3AWG.mjs
   ```

2. **Search for where price columns are defined** and add MRP columns manually

   **⚠️ Warning**: This will be overwritten on `npm install`. Use only as temporary fix.

### Option 4: Check Dev Mode Source Serving

In some Medusa setups, `medusa develop` uses Vite dev server which serves from source:

1. **Ensure patch is applied**:
   ```bash
   npx patch-package @medusajs/dashboard
   ```

2. **Stop and restart dev server**:
   ```bash
   # Stop: Ctrl+C
   npm run dev
   ```

3. **Check browser Network tab** - see if files are served from source or dist

## Verification

After applying any solution:

1. Navigate to: `http://localhost:9000/app/products/create`
2. Go to Tab 3 (Variants)
3. Check for MRP columns beside Selling Price columns
4. Check browser console (F12) for any errors

## Why This Happens

- Medusa v2 admin is a **pre-compiled npm package**
- Patches modify **source code** (`src/` folder)
- Admin is served from **compiled code** (`dist/` folder)
- `dist/` needs to be rebuilt from patched `src/` to see changes
- Rebuild requires `yarn` + `tsup` which aren't always available

## Long-term Solution

Consider:
1. Fork `@medusajs/dashboard` and publish your own version
2. Use Medusa's extension system if available
3. Create a custom widget that extends the pricing grid
4. Wait for Medusa to support MRP natively
