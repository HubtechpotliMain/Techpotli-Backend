# Admin Build Location Fix

## Problem
`npm start` was failing with:
```
Could not find index.html in the admin build directory
```

## Root Cause
- `medusa build` outputs admin to: `.medusa/server/public/admin`
- `npm start` (production mode) expects admin at: `public/admin`
- The build output wasn't copied to the expected location

## Solution Applied
Copied admin build to expected location:
```bash
# Copy admin build to public/admin
Copy-Item -Recurse ".medusa\server\public\admin" "public\admin"
```

## Now You Can Run
```bash
npm start
```

The server should start successfully now.

## Important Note About MRP

⚠️ **The admin build might still not show MRP columns** because:
- The build was created from pre-compiled `@medusajs/dashboard` package
- Our patches modify source code, but the build used the pre-compiled `dist/` folder
- To see MRP, we need to rebuild the dashboard package itself (requires yarn + tsup)

## Next Steps

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Check if MRP appears**:
   - Navigate to: `http://localhost:9000/app/products/create`
   - Go to Tab 3 (Variants)
   - Check if MRP columns are visible

3. **If MRP still doesn't show**:
   - The build needs to be regenerated from patched source
   - See `MRP_SOLUTION_SUMMARY.md` for options

## For Future Builds

Add this to your build process or create a script:
```bash
# After npm run build
mkdir -p public
cp -r .medusa/server/public/admin public/
```

Or add to `package.json`:
```json
{
  "scripts": {
    "build": "medusa build && npm run copy-admin",
    "copy-admin": "mkdir -p public && cp -r .medusa/server/public/admin public/"
  }
}
```
