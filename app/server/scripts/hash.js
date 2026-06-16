/**
 * Generate a bcrypt hash for a plaintext password.
 * Usage:  node scripts/hash.js "communitree123"
 * Used to (re)generate the seed admin password hash in 002_seed.sql.
 */
const bcrypt = require('bcryptjs');
const pw = process.argv[2];
if (!pw) {
  console.error('Usage: node scripts/hash.js "<password>"');
  process.exit(1);
}
console.log(bcrypt.hashSync(pw, 10));
