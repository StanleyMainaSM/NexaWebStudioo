from pathlib import Path
root = Path('.')

server_path = root / 'server.ts'
s = server_path.read_text()
marker = '''/*
 * ============================================================
 * APPROVE CONNECTOR APPLICATION
 * ============================================================
 */'''
endpoint = '''/*
 * PERMANENT ACCOUNT REMOVAL
 *
 * This route is separate from role removal and reversible deactivation.
 * Historical records that can safely be detached are preserved; identity-
 * dependent history that would be cascaded or restricted blocks deletion.
 */
app.delete("/api/owner/users/:id", async (req, res) => {
  let authDeleteAttempted = false;
  const detachedReferences: Array<{
    table: string;
    rows: Array<Record<string, any>>;
    columns: string[];
  }> = [];

  const restoreDetachedReferences = async () => {
    for (const detached of detachedReferences) {
      for (const row of detached.rows) {
        const restoreValues = Object.fromEntries(
          detached.columns.map((column) => [column, row[column]])
        );
        const { error: restoreError } = await supabaseAdmin
          .from(detached.table)
          .update(restoreValues)
          .eq("id", row.id);
        if (restoreError) {
          console.error(
            "Failed to restore detached account reference after permanent removal failure:",
            restoreError
          );
        }
      }
    }
  };

  try {
    const { user: ownerUser, error: authenticationError } = await getAuthenticatedUser(req);
    if (!ownerUser) return res.status(401).json({ error: authenticationError || "Unauthorized." });

    const authorized = await isOwner(ownerUser.id);
    if (!authorized) return res.status(403).json({ error: "Owner permission is required to permanently remove users." });

    const targetUserId = req.params.id;
    if (!targetUserId) return res.status(400).json({ error: "A target user account is required." });
    if (targetUserId === ownerUser.id) return res.status(400).json({ error: "You cannot permanently remove your own Owner account." });

    const { data: targetUser, error: targetUserError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (targetUserError || !targetUser.user) return res.status(404).json({ error: "Target user account was not found." });

    const { data: targetRoleRows, error: targetRolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId);
    if (targetRolesError) throw targetRolesError;

    const targetRoles = (targetRoleRows || []).map((row) => row.role);
    if (targetRoles.includes("owner")) return res.status(400).json({ error: "Another Owner account cannot be permanently removed." });

    const connectorIdentity = targetRoles.includes("connector");
    const blockers = [
      ["admin_conversations", "admin_id"], ["admin_conversations", "user_id"],
      ["admin_messages", "recipient_id"], ["admin_messages", "sender_id"],
      ["call_sessions", "callee_id"], ["call_sessions", "caller_id"],
      ["direct_conversation_participants", "user_id"], ["direct_conversations", "created_by"],
      ["direct_messages", "sender_id"], ["payouts", "recipient_id"],
      ["recurring_services", "client_id"], ["support_conversations", "user_id"],
      ["support_messages", "sender_id"],
    ] as const;

    for (const [table, column] of blockers) {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(column, targetUserId);
      if (error) throw error;
      if ((count || 0) > 0) {
        return res.status(409).json({
          error: "This account has identity-dependent history that cannot be safely removed without deleting or reassigning historical records. No account deletion was performed.",
        });
      }
    }

    const detach = async (table: string, columns: string[], matchColumn: string) => {
      const { data: rows, error: selectError } = await supabaseAdmin
        .from(table)
        .select(`id, ${columns.join(", ")}`)
        .eq(matchColumn, targetUserId);
      if (selectError) throw selectError;
      if (!rows?.length) return;
      detachedReferences.push({ table, rows, columns });
      const { error: updateError } = await supabaseAdmin
        .from(table)
        .update(Object.fromEntries(columns.map((column) => [column, null])))
        .eq(matchColumn, targetUserId);
      if (updateError) throw updateError;
    };

    await detach("commissions", ["connector_id"], "connector_id");
    await detach("invoices", ["client_id"], "client_id");
    await detach("maintenance_subscriptions", ["client_id"], "client_id");
    await detach("referral_bonuses", ["referred_connector_id"], "referred_connector_id");
    await detach("referral_bonuses", ["referrer_id"], "referrer_id");
    await detach("reviews", ["client_id"], "client_id");
    await detach("expenses", ["created_by"], "created_by");
    await detach("financial_records", ["created_by"], "created_by");
    await detach("payouts", ["confirmed_by"], "confirmed_by");
    await detach("payouts", ["sent_by"], "sent_by");
    await detach("reviews", ["reviewed_by"], "reviewed_by");

    authDeleteAttempted = true;
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (authDeleteError) {
      await restoreDetachedReferences();
      throw authDeleteError;
    }

    const { data: remainingAuthUser, error: verificationError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (remainingAuthUser?.user) {
      console.error("Permanent Auth deletion verification found the target account still present:", targetUserId);
    } else if (verificationError) {
      console.info("Permanent Auth deletion verification returned the expected missing-user result.", verificationError.message);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: ownerUser.id,
      action: "owner_user_permanently_deleted",
      entity_type: "user",
      entity_id: targetUserId,
      details: {
        deleted_user_id: targetUserId,
        email: targetUser.user.email || null,
        roles: targetRoles,
        connector_identity: connectorIdentity,
      },
    });
    if (auditError) {
      console.error("Permanent account removal audit error after successful Auth deletion:", auditError);
    }

    return res.json({
      success: true,
      message: "The account was permanently removed. Historical business records were preserved where safely detachable.",
      auditLogged: !auditError,
    });
  } catch (error) {
    if (!authDeleteAttempted && detachedReferences.length) await restoreDetachedReferences();
    console.error("Owner permanent account removal error:", error);
    return res.status(500).json({ error: "Permanent account removal could not be completed. No success state was recorded." });
  }
});

'''
assert s.count(marker) == 1
assert 'app.delete("/api/owner/users/:id"' not in s
s = s.replace(' * Member removal is intentionally reversible through the dedicated\n * member-status Edge Function. Permanent Auth deletion is not part of\n * normal Owner User Management.\n', ' * Member deactivation remains reversible through the dedicated\n * member-status Edge Function. Permanent Auth deletion is exposed only\n * through the separate, Owner-protected account-removal route below.\n', 1)
s = s.replace(marker, endpoint + marker, 1)
server_path.write_text(s)

ui_path = root / 'src/pages/portal/OwnerUserManagement.tsx'
u = ui_path.read_text()
u = u.replace("import { Loader2, LockKeyhole, RefreshCw, UserPlus, UserX, UserCheck, X } from 'lucide-react';", "import { Loader2, LockKeyhole, RefreshCw, UserPlus, UserX, UserCheck, Trash2, X } from 'lucide-react';", 1)
anchor = "  const setMemberActive = async (user: ManagedUser, active: boolean) => {"
handler = '''  const handleDeleteUser = async (user: ManagedUser) => {
    const confirmed = window.confirm(
      `Permanent Account Removal\\n\\n${user.full_name || user.email}'s account will be permanently removed.\\n\\nThis is NOT Deactivate and it is not Remove Role. Reactivate cannot restore a permanently removed account. This cannot be undone through Owner User Management. Historical/business records are not intentionally erased where they can be safely preserved. If this person returns as a Connector, they must apply and go through Connector onboarding again.\\n\\nContinue with permanent account removal?`
    );
    if (!confirmed) return;

    setAction(user.id);
    setError('');
    setSuccess('');
    try {
      const token = await getToken();
      const response = await fetch(`/api/owner/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Permanent account removal failed.');
      setUsers((current) => current.filter((item) => item.id !== user.id));
      setSuccess(result.message || `${user.full_name || user.email} was permanently removed.`);
    } catch (deleteError: any) {
      console.error('Owner permanent account removal error:', deleteError);
      setError(`Account could not be permanently removed: ${deleteError?.message || 'Unexpected error.'}`);
    } finally {
      setAction(null);
    }
  };

'''
assert u.count(anchor) == 1
u = u.replace(anchor, handler + anchor, 1)
u = u.replace('<p className="mt-2 text-sm text-gray-400">Add members, assign supported roles, remove roles, and reversibly deactivate accounts.</p>', '<p className="mt-2 text-sm text-gray-400">Add members, assign supported roles, remove roles, reversibly deactivate accounts, or permanently remove eligible accounts.</p>', 1)
old_actions = '''                {user.roles.includes('owner') ? null : user.is_active ? (
                  <button type="button" onClick={() => void setMemberActive(user, false)} disabled={action === user.id} className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300 disabled:opacity-50"><UserX className="w-4 h-4" />Deactivate</button>
                ) : (
                  <button type="button" onClick={() => void setMemberActive(user, true)} disabled={action === user.id} className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 px-3 py-2 text-xs text-emerald-300 disabled:opacity-50"><UserCheck className="w-4 h-4" />Reactivate</button>
                )}'''
new_actions = old_actions + '''
                {user.roles.includes('owner') ? null : (
                  <button type="button" onClick={() => void handleDeleteUser(user)} disabled={action === user.id} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 disabled:opacity-50" aria-label={`Permanently remove ${user.full_name || user.email} account`}><Trash2 className="w-4 h-4" />Permanent Remove</button>
                )}'''
assert u.count(old_actions) == 1
u = u.replace(old_actions, new_actions, 1)
ui_path.write_text(u)

test_path = root / 'tests/ownerUserManagementCompletion.test.mjs'
t = test_path.read_text()
old_test = '''test('Normal Owner User Management has no destructive user-delete route', () => {
  const source = read('server.ts');
  assert.doesNotMatch(source, /app\\.delete\\(\\s*"\\/api\\/owner\\/users\\/\\:id"/s);
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.doesNotMatch(ui, /\\/api\\/owner\\/users\\/\\$\\{user\\.id\\}\\s*['"`]/);
  assert.doesNotMatch(ui, /handleDeleteUser/);
});'''
new_test = '''test('Owner User Management exposes a distinct permanent account removal route and action', () => {
  const source = read('server.ts');
  assert.match(source, /app\\.delete\\(\\s*"\\/api\\/owner\\/users\\/\\:id"/s);
  assert.match(source, /auth\\.admin\\.deleteUser\\(\\s*targetUserId\\s*\\)/s);
  assert.match(source, /owner_user_permanently_deleted/);
  const ui = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(ui, /handleDeleteUser/);
  assert.match(ui, /Permanent Account Removal/);
  assert.match(ui, /Permanent Remove/);
});'''
assert old_test in t
t = t.replace(old_test, new_test, 1)
t += '''

test('Permanent removal protects self, other Owners, missing targets, and identity-dependent history', () => {
  const source = read('server.ts');
  assert.match(source, /status\\(401\\)/);
  assert.match(source, /status\\(403\\)/);
  assert.match(source, /targetUserId === ownerUser\\.id/);
  assert.match(source, /Another Owner account cannot be permanently removed/);
  assert.match(source, /auth\\.admin\\.getUserById\\(targetUserId\\)/);
  assert.match(source, /status\\(404\\)/);
  assert.match(source, /status\\(409\\)/);
  for (const table of ['admin_conversations','admin_messages','call_sessions','direct_messages','support_messages','recurring_services']) assert.match(source, new RegExp(table));
});

test('Permanent removal preserves nullable business history and does not delete business records', () => {
  const source = read('server.ts');
  for (const table of ['commissions','invoices','maintenance_subscriptions','referral_bonuses','reviews']) assert.match(source, new RegExp(`"${table}"`));
  assert.match(source, /Historical business records were preserved/);
  assert.doesNotMatch(source, /\\.from\\("projects"\\)[\\s\\S]*?\\.delete\\(/);
  assert.doesNotMatch(source, /\\.from\\("leads"\\)[\\s\\S]*?\\.delete\\(/);
  assert.doesNotMatch(source, /\\.from\\("invoices"\\)[\\s\\S]*?\\.delete\\(/);
});

test('Connector permanent removal records connector identity and audit metadata without secrets', () => {
  const source = read('server.ts');
  assert.match(source, /connectorIdentity/);
  assert.match(source, /targetRoles\\.includes\\("connector"\\)/);
  assert.match(source, /owner_user_permanently_deleted/);
  assert.match(source, /deleted_user_id: targetUserId/);
  assert.match(source, /email: targetUser\\.user\\.email/);
  assert.match(source, /roles: targetRoles/);
  assert.match(source, /connector_identity: connectorIdentity/);
  assert.doesNotMatch(source, /password|access_token|refresh_token|service_role|recovery_link|invitation_link/i);
  assert.match(read('src/pages/portal/OwnerUserManagement.tsx'), /Connector onboarding again/);
});

test('Permanent removal failure attempts reference restoration and does not report success', () => {
  const source = read('server.ts');
  assert.match(source, /authDeleteAttempted/);
  assert.match(source, /restoreDetachedReferences/);
  assert.match(source, /restoreError/);
  assert.match(source, /Permanent account removal could not be completed/);
});

test('Role X remains Remove Role and Deactivate/Reactivate remain independent', () => {
  const source = read('src/pages/portal/OwnerUserManagement.tsx');
  assert.match(source, /changeRole\\(user, role as AllowedRole, true\\)/);
  assert.match(source, /aria-label={`Remove \\${label\\(role\\)} role`}/);
  assert.match(source, /setMemberActive\\(user, false\\)/);
  assert.match(source, /setMemberActive\\(user, true\\)/);
  assert.match(source, /handleDeleteUser/);
  assert.match(source, /method: 'DELETE'/);
  assert.match(source, /\\/api\\/owner\\/users\\/\\$\\{user\\.id\\}/);
  assert.match(source, /if \\(!confirmed\\) return/);
  for (const phrase of ['Permanent Account Removal','NOT Deactivate','not Remove Role','Reactivate cannot restore','cannot be undone through Owner User Management','Historical/business records are not intentionally erased']) assert.ok(source.includes(phrase));
});
'''
test_path.write_text(t)
