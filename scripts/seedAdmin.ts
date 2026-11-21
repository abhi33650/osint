/**
 * Seed the initial admin user.
 * Run with:  npm run seed
 *
 * Uses relative imports (not @/ aliases) so it runs cleanly under tsx.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { connectToDatabase } from "../src/lib/database/mongodb";
import { User } from "../src/models/User";
import { hashPassword } from "../src/lib/auth/password";

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@linktrack.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const name = process.env.SEED_ADMIN_NAME ?? "LinkTrack Admin";

  await connectToDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`✔ Admin already exists: ${email}`);
  } else {
    await User.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
    });
    console.log(`✔ Created admin: ${email}`);
    console.log(`  Password: ${password}  (change it after first login)`);
  }

  await mongoose.connection.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
