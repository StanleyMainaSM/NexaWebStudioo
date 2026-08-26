import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { createClient } from "@Supabase/supabase-js";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

const supabaseSecretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Missing SUPABASE_URL. Add SUPABASE_URL to the server .env file."
  );
}

if (!supabaseSecretKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY. Add the Supabase server secret/service-role key to the server .env file."
  );
}

/*
 * SERVER-ONLY SUPABASE CLIENT.
 *
 * This key must NEVER be exposed to the browser.
 */
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseSecretKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);

const app = express();
const PORT = 3000;

app.use(express.json());

/*
 * ============================================================
 * HEALTH CHECK
 * ============================================================
 */

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

/*
 * ============================================================
 * AUTHENTICATION HELPERS
 * ============================================================
 */

async function getAuthenticatedUser(req: express.Request) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return {
      user: null,
      error: "Missing authentication token.",
    };
  }

  const token = authorization
    .substring("Bearer ".length)
    .trim();

  if (!token) {
    return {
      user: null,
      error: "Invalid authentication token.",
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    console.error("Authentication error:", error);

    return {
      user: null,
      error: "Your session is invalid or has expired.",
    };
  }

  return {
    user,
    error: null,
  };
}

/*
 * Verify that a user has Admin or Owner access.
 */
async function isAdminOrOwner(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "owner"]);

  if (error) {
    console.error("Role verification error:", error);

    throw new Error(
      "Unable to verify administrator permissions."
    );
  }

  return Array.isArray(data) && data.length > 0;
}

/*
 * Verify that a user has Owner access.
 *
 * Owner-only operations MUST use this check.
 */
async function isOwner(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();

  if (error) {
    console.error("Owner role verification error:", error);

    throw new Error(
      "Unable to verify Owner permissions."
    );
  }

  return Boolean(data);
}

/*
 * ============================================================
 * AUTH USER HELPERS
 * ============================================================
 */

async function findAuthUserByEmail(email: string) {
  const normalizedEmail =
    email.trim().toLowerCase();

  let page = 1;

  while (page <= 20) {
    const {
      data,
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const users = data.users || [];

    const found = users.find(
      (authUser) =>
        authUser.email
          ?.trim()
          .toLowerCase() === normalizedEmail
    );

    if (found) {
      return found;
    }

    if (users.length < 1000) {
      break;
    }

    page += 1;
  }

  return null;
}

/*
 * ============================================================
 * CONNECTOR APPLICATION SUBMISSION
 * ============================================================
 */

app.post(
  "/api/connector-applications",
  async (req, res) => {
    try {
      const {
        fullName,
        phone,
        email,
        nationalId,
        county,
        town,
        referringConnector,
      } = req.body || {};

      if (
        !fullName?.trim() ||
        !phone?.trim() ||
        !email?.trim() ||
        !nationalId?.trim() ||
        !county?.trim() ||
        !town?.trim()
      ) {
        return res.status(400).json({
          error:
            "Please complete all required application fields.",
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      let referringConnectorId: string | null =
        null;

      let referringConnectorAvlId: string | null =
        null;

      if (referringConnector?.trim()) {
        const avlId =
          referringConnector.trim().toUpperCase();

        const {
          data: connectorProfile,
          error: connectorLookupError,
        } = await supabaseAdmin
          .from("connector_profiles")
          .select(
            "user_id, avl_id, is_active"
          )
          .eq("avl_id", avlId)
          .maybeSingle();

        if (connectorLookupError) {
          console.error(
            "Referring connector lookup error:",
            connectorLookupError
          );

          return res.status(500).json({
            error:
              "We could not verify the referring Connector ID. Please try again.",
          });
        }

        if (!connectorProfile) {
          return res.status(400).json({
            error:
              `The referring Connector ID "${avlId}" was not found. Please check the ID and try again.`,
          });
        }

        if (!connectorProfile.is_active) {
          return res.status(400).json({
            error:
              `The referring Connector ID "${avlId}" is currently inactive and cannot be used.`,
          });
        }

        referringConnectorId =
          connectorProfile.user_id;

        referringConnectorAvlId =
          connectorProfile.avl_id;
      }

      const {
        data: application,
        error: applicationError,
      } = await supabaseAdmin
        .from("connector_applications")
        .insert({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: normalizedEmail,
          national_id_secure:
            nationalId.trim(),
          county: county.trim(),
          town: town.trim(),
          referring_connector_id:
            referringConnectorId,
          status: "pending",
        })
        .select()
        .single();

      if (applicationError) {
        console.error(
          "Connector application insert error:",
          applicationError
        );

        return res.status(500).json({
          error:
            applicationError.message ||
            "Failed to submit the connector application.",
        });
      }

      return res.status(201).json({
        success: true,
        message:
          "Connector application submitted successfully.",
        applicationId: application.id,
        referringConnectorId,
        referringConnectorAvlId,
      });
    } catch (error) {
      console.error(
        "Connector application submission error:",
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to submit the connector application.",
      });
    }
  }
);

/*
 * ============================================================
 * OWNER USER MANAGEMENT
 * ============================================================
 *
 * Owner can:
 *
 * 1. List all Avelixa users
 * 2. Create a new user
 * 3. Add a role
 * 4. Remove a role
 * 5. Permanently delete an account
 *
 * The service-role key is used ONLY on the server.
 *
 * Owner authorization is verified server-side for every
 * operation.
 *
 * Supported assignable roles:
 *
 * client
 * operator
 * connector
 * admin
 *
 * Owner is intentionally NOT assignable through this API.
 */

const OWNER_ASSIGNABLE_ROLES = [
  "client",
  "operator",
  "connector",
  "admin",
] as const;

type OwnerAssignableRole =
  (typeof OWNER_ASSIGNABLE_ROLES)[number];

function isOwnerAssignableRole(
  value: unknown
): value is OwnerAssignableRole {
  return (
    typeof value === "string" &&
    OWNER_ASSIGNABLE_ROLES.includes(
      value as OwnerAssignableRole
    )
  );
}

/*
 * GET ALL USERS
 */
app.get(
  "/api/owner/users",
  async (req, res) => {
    try {
      const {
        user: ownerUser,
        error: authenticationError,
      } = await getAuthenticatedUser(req);

      if (!ownerUser) {
        return res.status(401).json({
          error:
            authenticationError ||
            "Unauthorized.",
        });
      }

      const authorized =
        await isOwner(ownerUser.id);

      if (!authorized) {
        return res.status(403).json({
          error:
            "Owner permission is required to manage users.",
        });
      }

      const authUsers: any[] = [];

      let page = 1;

      while (page <= 20) {
        const {
          data,
          error,
        } =
          await supabaseAdmin.auth.admin.listUsers(
            {
              page,
              perPage: 1000,
            }
          );

        if (error) {
          throw error;
        }

        const pageUsers =
          data.users || [];

        authUsers.push(
          ...pageUsers
        );

        if (
          pageUsers.length < 1000
        ) {
          break;
        }

        page += 1;
      }

      const {
        data: profiles,
        error: profilesError,
      } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, email, full_name, created_at"
        );

      if (profilesError) {
        throw profilesError;
      }

      const profileMap =
        new Map<string, any>();

      (profiles || []).forEach(
        (profile) => {
          profileMap.set(
            profile.id,
            profile
          );
        }
      );

      const {
        data: roleRows,
        error: rolesError,
      } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) {
        throw rolesError;
      }

      const roleMap =
        new Map<string, string[]>();

      (roleRows || []).forEach(
        (row) => {
          const existing =
            roleMap.get(
              row.user_id
            ) || [];

          existing.push(
            row.role
          );

          roleMap.set(
            row.user_id,
            existing
          );
        }
      );

      const users =
        authUsers.map(
          (authUser) => {
            const profile =
              profileMap.get(
                authUser.id
              );

            const roles =
              roleMap.get(
                authUser.id
              ) || [];

            return {
              id: authUser.id,
              email:
                authUser.email ||
                profile?.email ||
                "",
              full_name:
                profile?.full_name ||
                authUser.user_metadata
                  ?.full_name ||
                "",
              created_at:
                profile?.created_at ||
                authUser.created_at ||
                null,
              last_sign_in_at:
                authUser.last_sign_in_at ||
                null,
              email_confirmed:
                Boolean(
                  authUser.email_confirmed_at
                ),
              roles,
            };
          }
        );

      users.sort(
        (a, b) => {
          const aOwner =
            a.roles.includes(
              "owner"
            );

          const bOwner =
            b.roles.includes(
              "owner"
            );

          if (
            aOwner &&
            !bOwner
          ) {
            return -1;
          }

          if (
            !aOwner &&
            bOwner
          ) {
            return 1;
          }

          return (
            a.full_name ||
            a.email
          ).localeCompare(
            b.full_name ||
              b.email
          );
        }
      );

      return res.json({
        success: true,
        users,
      });
    } catch (error) {
      console.error(
        "Owner users list error:",
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load users.",
      });
    }
  }
);

/*
 * CREATE USER
 */
app.post(
  "/api/owner/users",
  async (req, res) => {
    let newlyCreatedAuthUserId:
      | string
      | null = null;

    try {
      const {
        user: ownerUser,
        error: authenticationError,
      } = await getAuthenticatedUser(req);

      if (!ownerUser) {
        return res.status(401).json({
          error:
            authenticationError ||
            "Unauthorized.",
        });
      }

      const authorized =
        await isOwner(ownerUser.id);

      if (!authorized) {
        return res.status(403).json({
          error:
            "Owner permission is required to create users.",
        });
      }

      const {
        fullName,
        email,
        role,
      } = req.body || {};

      if (
        typeof fullName !== "string" ||
        !fullName.trim()
      ) {
        return res.status(400).json({
          error:
            "Please enter the user's full name.",
        });
      }

      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        return res.status(400).json({
          error:
            "Please enter the user's email address.",
        });
      }

      if (
        !isOwnerAssignableRole(
          role
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid user role. Allowed roles are Client, Operator, Connector, and Admin.",
        });
      }

      const normalizedEmail =
        email.trim().toLowerCase();

      const existingUser =
        await findAuthUserByEmail(
          normalizedEmail
        );

      if (existingUser) {
        return res.status(409).json({
          error:
            "A user with this email address already exists.",
        });
      }

      const appUrl =
        process.env.APP_URL ||
        "http://localhost:3000";

      const {
        data: invitedUser,
        error: inviteError,
      } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(
          normalizedEmail,
          {
            data: {
              full_name:
                fullName.trim(),
              account_type: role,
              created_by_owner:
                ownerUser.id,
              password_setup_required:
                true,
            },
            redirectTo:
              `${appUrl}/reset-password`,
          }
        );

      if (inviteError) {
        throw inviteError;
      }

      if (!invitedUser.user) {
        throw new Error(
          "Supabase did not return the newly created user account."
        );
      }

      newlyCreatedAuthUserId =
        invitedUser.user.id;

      const {
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id:
              invitedUser.user.id,
            email:
              normalizedEmail,
            full_name:
              fullName.trim(),
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw profileError;
      }

      const {
        error: roleError,
      } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          {
            user_id:
              invitedUser.user.id,
            role,
          },
          {
            onConflict:
              "user_id,role",
          }
        );

      if (roleError) {
        throw roleError;
      }

      if (role === "connector") {
        const {
          error:
            connectorProfileError,
        } = await supabaseAdmin
          .from("connector_profiles")
          .upsert(
            {
              user_id:
                invitedUser.user.id,
              is_active: true,
              commission_rate: 20,
            },
            {
              onConflict:
                "user_id",
            }
          );

        if (
          connectorProfileError
        ) {
          throw connectorProfileError;
        }
      }

      const {
        error: auditError,
      } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          user_id:
            ownerUser.id,
          action:
            "owner_user_created",
          entity_type: "user",
          entity_id:
            invitedUser.user.id,
          details: {
            created_user_id:
              invitedUser.user.id,
            email:
              normalizedEmail,
            role,
            invitation_sent:
              true,
          },
        });

      if (auditError) {
        console.error(
          "Owner user creation audit error:",
          auditError
        );
      }

      return res.status(201).json({
        success: true,
        message:
          "User created successfully. An invitation has been sent to the user's email address.",
        userId:
          invitedUser.user.id,
        invitationSent: true,
        passwordSetupRequired: true,
      });
    } catch (error) {
      console.error(
        "Owner user creation error:",
        error
      );

      if (
        newlyCreatedAuthUserId
      ) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(
            newlyCreatedAuthUserId
          );
        } catch (cleanupError) {
          console.error(
            "Failed to clean up newly created Auth user:",
            cleanupError
          );
        }
      }

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create user.",
      });
    }
  }
);

/*
 * ADD ROLE
 */
app.post(
  "/api/owner/users/:id/roles",
  async (req, res) => {
    try {
      const {
        user: ownerUser,
        error: authenticationError,
      } = await getAuthenticatedUser(req);

      if (!ownerUser) {
        return res.status(401).json({
          error:
            authenticationError ||
            "Unauthorized.",
        });
      }

      const authorized =
        await isOwner(ownerUser.id);

      if (!authorized) {
        return res.status(403).json({
          error:
            "Owner permission is required to manage user roles.",
        });
      }

      const targetUserId =
        req.params.id;

      const { role } =
        req.body || {};

      if (
        !isOwnerAssignableRole(
          role
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid role. Owner cannot assign the Owner role through this interface.",
        });
      }

      if (
        targetUserId ===
        ownerUser.id
      ) {
        return res.status(400).json({
          error:
            "The Owner account is already the Owner. Manage other users instead.",
        });
      }

      const {
        data: targetUser,
        error:
          targetUserError,
      } =
        await supabaseAdmin.auth.admin.getUserById(
          targetUserId
        );

      if (
        targetUserError ||
        !targetUser.user
      ) {
        return res.status(404).json({
          error:
            "Target user account was not found.",
        });
      }

      const {
        error: roleError,
      } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          {
            user_id:
              targetUserId,
            role,
          },
          {
            onConflict:
              "user_id,role",
          }
        );

      if (roleError) {
        throw roleError;
      }

      if (role === "connector") {
        const {
          error:
            connectorProfileError,
        } = await supabaseAdmin
          .from("connector_profiles")
          .upsert(
            {
              user_id:
                targetUserId,
              is_active: true,
              commission_rate: 20,
            },
            {
              onConflict:
                "user_id",
            }
          );

        if (
          connectorProfileError
        ) {
          throw connectorProfileError;
        }
      }

      const {
        error: auditError,
      } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          user_id:
            ownerUser.id,
          action:
            "owner_user_role_added",
          entity_type: "user",
          entity_id:
            targetUserId,
          details: {
            role,
            target_email:
              targetUser.user
                .email ||
              null,
          },
        });

      if (auditError) {
        console.error(
          "Owner role-add audit error:",
          auditError
        );
      }

      return res.json({
        success: true,
        message:
          `${role} role added successfully.`,
      });
    } catch (error) {
      console.error(
        "Owner add-role error:",
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to add role.",
      });
    }
  }
);

/*
 * REMOVE ROLE
 */
app.delete(
  "/api/owner/users/:id/roles/:role",
  async (req, res) => {
    try {
      const {
        user: ownerUser,
        error: authenticationError,
      } = await getAuthenticatedUser(req);

      if (!ownerUser) {
        return res.status(401).json({
          error:
            authenticationError ||
            "Unauthorized.",
        });
      }

      const authorized =
        await isOwner(ownerUser.id);

      if (!authorized) {
        return res.status(403).json({
          error:
            "Owner permission is required to manage user roles.",
        });
      }

      const targetUserId =
        req.params.id;

      const selectedRole =
        req.params.role;

      if (
        selectedRole ===
        "owner"
      ) {
        return res.status(400).json({
          error:
            "The Owner role cannot be removed through this interface.",
        });
      }

      if (
        !isOwnerAssignableRole(
          selectedRole
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid role.",
        });
      }

      if (
        targetUserId ===
        ownerUser.id
      ) {
        return res.status(400).json({
          error:
            "You cannot remove roles from the current Owner account.",
        });
      }

      const {
        data: removedRows,
        error: roleError,
      } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", targetUserId)
        .eq("role", selectedRole)
        .select();

      if (roleError) {
        throw roleError;
      }

      if (
        selectedRole ===
        "connector"
      ) {
        const {
          error:
            connectorProfileError,
        } = await supabaseAdmin
          .from("connector_profiles")
          .update({
            is_active: false,
          })
          .eq(
            "user_id",
            targetUserId
          );

        if (
          connectorProfileError
        ) {
          console.error(
            "Connector profile deactivation error:",
            connectorProfileError
          );
        }
      }

      const {
        error: auditError,
      } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          user_id:
            ownerUser.id,
          action:
            "owner_user_role_removed",
          entity_type: "user",
          entity_id:
            targetUserId,
          details: {
            role:
              selectedRole,
            removed:
              Boolean(
                removedRows &&
                  removedRows.length
              ),
          },
        });

      if (auditError) {
        console.error(
          "Owner role-removal audit error:",
          auditError
        );
      }

      return res.json({
        success: true,
        message:
          `${selectedRole} role removed successfully.`,
      });
    } catch (error) {
      console.error(
        "Owner remove-role error:",
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove role.",
      });
    }
  }
);

/*
 * DELETE USER
 */
app.delete(
  "/api/owner/users/:id",
  async (req, res) => {
    try {
      const {
        user: ownerUser,
        error: authenticationError,
      } = await getAuthenticatedUser(req);

      if (!ownerUser) {
        return res.status(401).json({
          error:
            authenticationError ||
            "Unauthorized.",
        });
      }

      const authorized =
        await isOwner(ownerUser.id);

      if (!authorized) {
        return res.status(403).json({
          error:
            "Owner permission is required to delete users.",
        });
      }

      const targetUserId =
        req.params.id;

      if (
        targetUserId ===
        ownerUser.id
      ) {
        return res.status(400).json({
          error:
            "The current Owner account cannot be deleted from this interface.",
        });
      }

      const {
        data: targetUser,
        error:
          targetUserError,
      } =
        await supabaseAdmin.auth.admin.getUserById(
          targetUserId
        );

      if (
        targetUserError ||
        !targetUser.user
      ) {
        return res.status(404).json({
          error:
            "User account not found.",
        });
      }

      const {
        data: targetOwnerRole,
        error:
          targetOwnerRoleError,
      } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq(
          "user_id",
          targetUserId
        )
        .eq("role", "owner")
        .maybeSingle();

      if (
        targetOwnerRoleError
      ) {
        throw targetOwnerRoleError;
      }

      if (targetOwnerRole) {
        return res.status(400).json({
          error:
            "Another Owner account cannot be deleted through this interface.",
        });
      }

      const {
        error: auditError,
      } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          user_id:
            ownerUser.id,
          action:
            "owner_user_deleted",
          entity_type: "user",
          entity_id:
            targetUserId,
          details: {
            deleted_email:
              targetUser.user
                .email ||
              null,
            deleted_user_id:
              targetUserId,
          },
        });

      if (auditError) {
        console.error(
          "Owner user deletion audit error:",
          auditError
        );
      }

      const {
        error: deleteError,
      } =
        await supabaseAdmin.auth.admin.deleteUser(
          targetUserId
        );

      if (deleteError) {
        throw deleteError;
      }

      return res.json({
        success: true,
        message:
          "User account deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Owner user deletion error:",
        error
      );

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete user.",
      });
    }
  }
);

/*
 * ============================================================
 * APPROVE CONNECTOR APPLICATION
 * ============================================================
 */

app.post(
  "/api/admin/connector-applications/:id/approve",
  async (req, res) => {
    const applicationId =
      req.params.id;

    let newlyCreatedAuthUserId:
      | string
      | null = null;

    try {
      const {
        user: adminUser,
        error: authenticationError,
      } = await getAuthenticatedUser(req);

      if (!adminUser) {
        return res.status(401).json({
          error:
            authenticationError ||
            "Unauthorized.",
        });
      }

      const authorized =
        await isAdminOrOwner(
          adminUser.id
        );

      if (!authorized) {
        return res.status(403).json({
          error:
            "You do not have permission to approve connector applications.",
        });
      }

      const {
        data: application,
        error: applicationError,
      } = await supabaseAdmin
        .from("connector_applications")
        .select("*")
        .eq("id", applicationId)
        .maybeSingle();

      if (applicationError) {
        throw applicationError;
      }

      if (!application) {
        return res.status(404).json({
          error:
            "Connector application not found.",
        });
      }

      if (
        application.status !==
        "pending"
      ) {
        return res.status(400).json({
          error:
            `This application has already been ${application.status || "processed"}.`,
        });
      }

      let authUser =
        await findAuthUserByEmail(
          application.email
        );

      if (!authUser) {
        const appUrl =
          process.env.APP_URL ||
          "http://localhost:3000";

        const {
          data: invitedUser,
          error: inviteError,
        } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(
            application.email,
            {
              data: {
                full_name:
                  application.full_name,
                phone:
                  application.phone,
                county:
                  application.county,
                town:
                  application.town,
                account_type:
                  "connector",
                application_status:
                  "approved",
                application_id:
                  application.id,
                password_setup_required:
                  true,
              },
              redirectTo:
                `${appUrl}/reset-password`,
            }
          );

        if (inviteError) {
          throw inviteError;
        }

        if (!invitedUser.user) {
          throw new Error(
            "Supabase did not return the newly created connector account."
          );
        }

        authUser =
          invitedUser.user;

        newlyCreatedAuthUserId =
          authUser.id;
      }

      const {
        error: profileError,
      } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: authUser.id,
            email:
              application.email,
            full_name:
              application.full_name,
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw profileError;
      }

      const {
        error: roleError,
      } = await supabaseAdmin
        .from("user_roles")
        .upsert(
          {
            user_id:
              authUser.id,
            role: "connector",
          },
          {
            onConflict:
              "user_id,role",
          }
        );

      if (roleError) {
        throw roleError;
      }

      const {
        error:
          connectorProfileError,
      } = await supabaseAdmin
        .from("connector_profiles")
        .upsert(
          {
            user_id:
              authUser.id,
            is_active: true,
            commission_rate: 20,
          },
          {
            onConflict:
              "user_id",
          }
        );

      if (
        connectorProfileError
      ) {
        throw connectorProfileError;
      }

      const {
        data:
          approvedApplication,
        error: approvalError,
      } = await supabaseAdmin
        .from("connector_applications")
        .update({
          status: "approved",
          rejection_reason: null,
        })
        .eq("id", applicationId)
        .select()
        .maybeSingle();

      if (approvalError) {
        throw approvalError;
      }

      if (!approvedApplication) {
        throw new Error(
          "The connector account was created, but the application could not be marked approved."
        );
      }

      const {
        error: auditError,
      } = await supabaseAdmin
        .from("audit_logs")
        .insert({
          user_id:
            adminUser.id,
          action:
            "connector_application_approved",
          entity_type:
            "connector_application",
          entity_id:
            applicationId,
          details: {
            connector_user_id:
              authUser.id,
            connector_email:
              application.email,
            password_setup_required:
              true,
            invitation_sent:
              Boolean(
                newlyCreatedAuthUserId
              ),
          },
        });

      if (auditError) {
        console.error(
          "Audit log error after connector approval:",
          auditError
        );
      }

      return res.json({
        success: true,
        message:
          "Connector application approved successfully. A password setup invitation has been sent to the applicant's email address.",
        connectorUserId:
          authUser.id,
        newlyCreatedAccount:
          Boolean(
            newlyCreatedAuthUserId
          ),
        passwordSetupRequired:
          true,
        invitationSent:
          Boolean(
            newlyCreatedAuthUserId
          ),
      });
    } catch (error) {
      console.error(
        "Connector approval error:",
        error
      );

      if (
        newlyCreatedAuthUserId
      ) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(
            newlyCreatedAuthUserId
          );
        } catch (cleanupError) {
          console.error(
            "Failed to clean up new Auth user:",
            cleanupError
          );
        }
      }

      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to approve connector application.",
      });
    }
  }
);

/*
 * ============================================================
 * VITE / PRODUCTION FRONTEND
 * ============================================================
 */

async function startServer() {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },
        appType: "spa",
      });

    app.use(vite.middlewares);
  } else {
    /*
     * In the bundled production build, server.js is located
     * directly inside the dist directory.
     *
     * Therefore __dirname already points to:
     *
     *   <project>/dist
     *
     * Do NOT append another "dist" directory here.
     */
    const distPath = __dirname;

    app.use(
      express.static(
        distPath
      )
    );

    /*
     * Express 5 requires a named wildcard parameter.
     * This preserves SPA fallback routing for every
     * non-API path while remaining compatible with
     * path-to-regexp used by Express 5.
     */
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(
        path.join(
          distPath,
          "index.html"
        )
      );
    });
  }

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `Avelixa server running on http://localhost:${PORT}`
      );
    }
  );
}

startServer().catch(
  (error) => {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
);