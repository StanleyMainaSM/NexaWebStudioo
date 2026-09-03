import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const functionPath = path.join(root, "supabase", "functions", "avelixa-connector-activation-resend-prod", "index.ts");
const migrationPath = path.join(root, "supabase", "migrations", "20260903091000_redact_connector_activation_links.sql");

const source = fs.readFileSync(functionPath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");

assert.match(source, /getUser\(token\)/, "resend must authenticate the caller token");
assert.match(source, /in\("role", \["admin", "owner"\]\)/, "resend must require Admin or Owner");
assert.match(source, /eq\("role", "connector"\)/, "resend must verify the target Connector role");
assert.match(source, /generateLink\(\{\s*type: "recovery"/s, "resend must generate a fresh recovery link");
assert.doesNotMatch(source, /temporary_password|temp_password|password\s*:/i, "resend must not create or send a plaintext password");
assert.match(source, /notification_email_queue/, "resend must use the existing email queue for rate limiting/delivery state");
assert.match(source, /from\("notifications"\)\.insert/, "resend must enter the existing notification architecture");
assert.match(source, /set-password/, "resend must return users to the secure password setup flow");
assert.match(migration, /redact_connector_activation_notification_link/, "activation notification links must be redacted");
assert.match(migration, /redact_sent_connector_activation_email_body/, "sent activation email bodies must be redacted");

console.log("Connector activation resend security regression tests passed.");
