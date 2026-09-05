from pathlib import Path
import re
import subprocess

message = subprocess.check_output(["git", "log", "-1", "--pretty=%s"], text=True).strip()
if "feat: enforce Owner User Management access gate" in message:
    raise SystemExit(0)

def replace(path, old, new):
    p = Path(path)
    s = p.read_text()
    if old not in s:
        raise SystemExit(f"pattern not found: {path}: {old[:90]!r}")
    p.write_text(s.replace(old, new, 1))

def regex_replace(path, pattern, replacement):
    p = Path(path)
    s = p.read_text()
    out, count = re.subn(pattern, replacement, s, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"regex pattern not found: {path}: {pattern[:90]!r}")
    p.write_text(out)

replace("server.ts", "async function getAuthenticatedUser(req: express.Request) {", """async function hasOwnerPortalAccess(token: string) {
  const caller = createClient(supabaseUrl!, supabaseSecretKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await caller.rpc('has_portal_access', { p_portal: 'owner' });
  if (error) {
    console.error('Owner User Management access-gate verification error:', error);
    return false;
  }
  return data === true;
}

async function getAuthenticatedUser(req: express.Request) {""")
replace("server.ts", """  return {
    user,
    error: null,
  };""", """  if (req.path.startsWith("/api/owner/users")) {
    const { data: ownerRole, error: ownerRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .maybeSingle();
    if (ownerRoleError || !ownerRole) {
      return { user: null, error: ownerRoleError ? "Unable to verify Owner permissions for User Management." : "Owner permission is required to manage users." };
    }
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return { user: null, error: "Unable to verify the Owner account state." };
    if (profile?.is_active === false) return { user: null, error: "The Owner account is inactive." };
    if (!(await hasOwnerPortalAccess(token))) {
      return { user: null, error: "User Management access is locked. Re-enter the Owner access password." };
    }
  }

  return {
    user,
    error: null,
  };""")
replace("server.ts", '"id, email, full_name, created_at"', '"id, email, full_name, created_at, is_active"')
replace("server.ts", """              email_confirmed:
                Boolean(
                  authUser.email_confirmed_at
                ),
              roles,""", """              email_confirmed:
                Boolean(
                  authUser.email_confirmed_at
                ),
              is_active:
                profile?.is_active !== false,
              roles,""")
replace("supabase/functions/avelixa-owner-member-status-prod/index.ts", '    if (!ownerRole) return json({ error: "Owner permission is required to manage members." }, 403);\n\n', """    if (!ownerRole) return json({ error: "Owner permission is required to manage members." }, 403);

    const { data: ownerProfile, error: ownerProfileError } = await admin
      .from("profiles")
      .select("is_active")
      .eq("id", actorId)
      .maybeSingle();
    if (ownerProfileError) return json({ error: "Unable to verify the Owner account state." }, 500);
    if (ownerProfile?.is_active === false) return json({ error: "The Owner account is inactive." }, 403);
    const caller = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: gateOpen, error: gateError } = await caller.rpc("has_portal_access", { p_portal: "owner" });
    if (gateError) return json({ error: "Unable to verify User Management access." }, 500);
    if (gateOpen !== true) return json({ error: "User Management access is locked. Re-enter the Owner access password." }, 403);

""")

ui = Path("src/pages/portal/OwnerUserManagement.tsx")
s = ui.read_text()
if "clearPortalAccess" not in s:
    s = s.replace("import { supabase } from '../../lib/supabase';", "import { supabase } from '../../lib/supabase';\nimport { clearPortalAccess, hasPortalAccess, verifyPortalPassword } from '../../lib/portalAccess';", 1)
verify_pattern = r"      const \{ data: \{ user \} \} = await supabase\.auth\.getUser\(\);\n      if \(!user\?\.email\) throw new Error\('Authenticated Owner account could not be identified\.'\);\n      const \{ error: signInError \} = await supabase\.auth\.signInWithPassword\(\{ email: user\.email, password \}\);\n      if \(signInError\) throw signInError;\n      sessionStorage\.setItem\(`avelixa_owner_user_management_verified:\$\{user\.id\}`, 'true'\);\n      setPassword\(''\);\n      setVerified\(true\);"
verify_replacement = """      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('Authenticated Owner account could not be identified.');
      const verified = await verifyPortalPassword('owner', password);
      if (!verified) throw new Error('The Owner User Management access password is incorrect.');
      const unlocked = await hasPortalAccess('owner');
      if (!unlocked) throw new Error('User Management access could not be established for this session.');
      setPassword('');
      setVerified(true);"""
s, count = re.subn(verify_pattern, verify_replacement, s, count=1)
if count != 1:
    raise SystemExit("regex pattern not found: OwnerUserManagement verify block")
ui.write_text(s)
s = ui.read_text()
if "sessionStorage.getItem(`avelixa_owner_user_management_verified:${user.id}`)" in s:
    s = s.replace("setVerified(sessionStorage.getItem(`avelixa_owner_user_management_verified:${user.id}`) === 'true');", "setVerified(await hasPortalAccess('owner'));")
ui.write_text(s)
if "clearPortalAccess('owner')" not in s:
    regex_replace("src/pages/portal/OwnerUserManagement.tsx", r"  useEffect\(\(\) => \{\n    let mounted = true;", """  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setVerified(false);
        setUsers([]);
        setPassword('');
        void clearPortalAccess('owner');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;""")
s = ui.read_text()
s = s.replace('Re-enter your current Owner account password to manage users.', 'Enter your Owner User Management access password to manage users.')
s = s.replace('placeholder="Enter your login password"', 'placeholder="Enter your Owner access password"')
ui.write_text(s)

for f in [".github/workflows/stage4-implementation-patch.yml", ".github/workflows/stage4-implementation-patch2.yml", "docs/.stage4-trigger"]:
    p = Path(f)
    if p.exists():
        p.unlink()
