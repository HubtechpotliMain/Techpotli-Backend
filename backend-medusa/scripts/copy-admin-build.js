/**
 * Copy admin build from .medusa/server/public/admin to public/admin
 * This is needed because medusa build outputs to .medusa/server/public/admin
 * but production mode (npm start) expects it at public/admin
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', '.medusa', 'server', 'public', 'admin');
const targetDir = path.join(__dirname, '..', 'public', 'admin');

try {
  // Check if source exists
  if (!fs.existsSync(sourceDir)) {
    console.log('⚠️  Admin build not found at:', sourceDir);
    console.log('   Skipping copy (this is normal if build failed)');
    process.exit(0);
  }

  // Create public directory if it doesn't exist
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Remove existing target if it exists
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  // Copy admin build
  fs.cpSync(sourceDir, targetDir, { recursive: true });

  console.log('✅ Admin build copied to public/admin');
} catch (error) {
  console.error('❌ Error copying admin build:', error.message);
  process.exit(1);
}
