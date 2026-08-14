import postgres from "postgres";
import { hash } from "bcryptjs";

const databaseUrl = process.env.POSTGRES_URL;
const email = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
const temporaryPassword = process.env.MASTER_ADMIN_TEMP_PASSWORD;
if (!databaseUrl || !email || !temporaryPassword) {
  throw new Error("POSTGRES_URL, MASTER_ADMIN_EMAIL and MASTER_ADMIN_TEMP_PASSWORD are required");
}
if (temporaryPassword.length < 10) throw new Error("The temporary password must contain at least 10 characters");

const sql = postgres(databaseUrl, { prepare: false, max: 1 });
let created = false;
try {
  await sql.begin(async (transaction) => {
    const passwordHash = await hash(temporaryPassword, 12);
    const [existing] = await transaction`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
    created = !existing;
    const [member] = existing ? await transaction`
      UPDATE users SET email_verified = COALESCE(email_verified, NOW()), onboarding_completed_at = COALESCE(onboarding_completed_at, NOW()), status = 'active', updated_at = NOW()
      WHERE id = ${existing.id} RETURNING id
    ` : await transaction`
      INSERT INTO users (name, first_name, last_name, email, email_verified, onboarding_completed_at, password_hash, role, status, force_password_change, age_band, created_at, updated_at)
      VALUES ('Anthony Osei', 'Anthony', 'Osei', ${email}, NOW(), NOW(), ${passwordHash}, 'member', 'active', TRUE, 'adult_25_plus', NOW(), NOW())
      RETURNING id
    `;
    await transaction`
      INSERT INTO privacy_settings (user_id, profile_visibility, message_permission, show_location, show_availability, use_activity_for_matching, allow_introductions, updated_at)
      VALUES (${member.id}, 'network', 'connections', FALSE, TRUE, TRUE, TRUE, NOW())
      ON CONFLICT (user_id) DO NOTHING
    `;
    await transaction`
      INSERT INTO admin_assignments (user_id, role, status, created_at, updated_at)
      VALUES (${member.id}, 'master_admin', 'active', NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET role = 'master_admin', status = 'active', expires_at = NULL, updated_at = NOW()
    `;
    await transaction`
      INSERT INTO audit_log (actor_id, action, target_type, target_id, permission, reason, severity, metadata, created_at)
      VALUES (${member.id}, 'admin.bootstrap', 'user', ${member.id}, 'admins.manage', ${existing ? "Existing member promoted to master administrator" : "Initial master administrator provisioning"}, 'high', ${sql.json({ source: "bootstrap-script", created: !existing })}, NOW())
    `;
  });
  console.log(created ? "Master administrator created; password rotation and MFA are required before admin access." : "Existing member promoted to master administrator; MFA is required before admin access.");
} finally {
  await sql.end();
}
