// lib/auth-clerk.js
import { getAuth } from "@clerk/nextjs/server";
import { createClerkClient } from "@clerk/backend";
import dbConnect from "./db";
import User from "../models/User";

// ✅ Only create Clerk backend client when secret exists (prevents runtime issues in envs without it)
const clerk = process.env.CLERK_SECRET_KEY
  ? createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  : null;

// ✅ Mongo schema requires email — so fallback must never be empty
function placeholderEmail(clerkUserId) {
  return `${clerkUserId}@no-email.local`;
}

/**
 * Small helper to safely create a user in serverless/race conditions.
 * If a duplicate key happens, re-fetch and return the existing record.
 */
async function safeCreateUser(doc) {
  try {
    return await User.create(doc);
  } catch (e) {
    if (e?.code === 11000) {
      if (doc?.clerkUserId) {
        const u = await User.findOne({ clerkUserId: doc.clerkUserId });
        if (u) return u;
      }
      if (doc?.email) {
        const u = await User.findOne({ email: doc.email });
        if (u) return u;
      }
    }
    throw e;
  }
}

const ADMIN_EMAILS = ["applepatient@gmail.com"].map((e) =>
  String(e).toLowerCase()
);

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(String(email || "").toLowerCase());
}

/**
 * ✅ Best-effort throttle so we don't call Clerk on every request.
 * Keyed by clerkUserId. In serverless this is "best effort" (may reset).
 */
function shouldSyncRestricted(clerkUserId, restricted) {
  try {
    if (!clerkUserId) return false;

    // If not restricted, we generally don't need constant syncing.
    // We rely on explicit sync calls from webhooks/admin actions.
    if (!restricted) return false;

    const now = Date.now();
    const TTL_MS = 10 * 60 * 1000; // 10 minutes

    if (!globalThis.__CLERK_RESTRICT_SYNC__)
      globalThis.__CLERK_RESTRICT_SYNC__ = new Map();

    const store = globalThis.__CLERK_RESTRICT_SYNC__;
    const prev = store.get(clerkUserId);

    // Sync if never synced, or last sync too old, or cached value differs
    if (!prev || prev.at + TTL_MS < now || prev.restricted !== !!restricted) {
      store.set(clerkUserId, { at: now, restricted: !!restricted });
      return true;
    }

    return false;
  } catch {
    // If anything weird happens, avoid syncing rather than breaking auth
    return false;
  }
}

/**
 * ✅ Sync "restricted" flag into Clerk user metadata
 * Middleware reads this to block restricted users from the app.
 *
 * We MERGE metadata (we do not want to overwrite other publicMetadata keys).
 */
export async function syncClerkRestrictedFlag(
  clerkUserId,
  restricted,
  knownPublicMetadata = null
) {
  try {
    if (!clerk) return; // no secret configured
    if (!clerkUserId) return;

    // If caller already has metadata, avoid extra getUser call.
    if (knownPublicMetadata && typeof knownPublicMetadata === "object") {
      const nextPublic = { ...knownPublicMetadata, restricted: !!restricted };
      await clerk.users.updateUserMetadata(clerkUserId, {
        publicMetadata: nextPublic,
      });
      return;
    }

    // Otherwise fetch then merge
    const cu = await clerk.users.getUser(clerkUserId);
    const currentPublic = (cu && cu.publicMetadata) || {};
    const nextPublic = { ...currentPublic, restricted: !!restricted };

    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: nextPublic,
    });
  } catch (e) {
    // best-effort: do not break auth flows if Clerk metadata sync fails
    console.warn("⚠️ syncClerkRestrictedFlag failed:", e?.message || e);
  }
}

/**
 * Create or update user in MongoDB from Clerk webhook data
 */
export async function createUserFromWebhook(webhookData) {
  await dbConnect();

  const {
    id: clerkUserId,
    email_addresses,
    first_name,
    last_name,
  } = webhookData || {};

  const email = email_addresses?.[0]?.email_address || "";
  const name = `${first_name || ""} ${last_name || ""}`.trim() || "User";

  // ✅ CONSISTENT POLICY: never crash validation — use placeholder if missing
  const safeEmail = email || placeholderEmail(clerkUserId);

  let user = await User.findOne({ clerkUserId });

  if (user) {
    user.email = safeEmail;
    user.name = name;

    const shouldBeAdmin = isAdminEmail(safeEmail);
    if (shouldBeAdmin && user.role !== "admin") {
      user.role = "admin";
    }

    await user.save();

    // ✅ Keep Clerk metadata in sync (restricted gating)
    await syncClerkRestrictedFlag(clerkUserId, !!user.restricted);

    console.log(
      `✅ Updated existing MongoDB user from webhook: ${safeEmail} (${user.role})`
    );
    return user;
  }

  // Try to link by email (guard against linking an email already bound to another Clerk ID)
  const existingUser = await User.findOne({ email: safeEmail });

  if (existingUser) {
    if (existingUser.clerkUserId && existingUser.clerkUserId !== clerkUserId) {
      throw new Error("Email already linked to a different Clerk user");
    }

    existingUser.clerkUserId = clerkUserId;

    if (
      name &&
      name !== "User" &&
      (!existingUser.name || existingUser.name === "User")
    ) {
      existingUser.name = name;
    }

    const shouldBeAdmin = isAdminEmail(safeEmail);
    if (shouldBeAdmin && existingUser.role !== "admin") {
      existingUser.role = "admin";
    }

    await existingUser.save();

    // ✅ Keep Clerk metadata in sync (restricted gating)
    await syncClerkRestrictedFlag(clerkUserId, !!existingUser.restricted);

    console.log(
      `✅ Linked existing MongoDB user to Clerk via webhook: ${safeEmail} (${existingUser.role})`
    );
    return existingUser;
  }

  const role = isAdminEmail(safeEmail) ? "admin" : "user";

  user = await safeCreateUser({
    clerkUserId,
    email: safeEmail,
    name,
    role,
  });

  // ✅ Keep Clerk metadata in sync (restricted gating)
  await syncClerkRestrictedFlag(clerkUserId, !!user.restricted);

  console.log(
    `✅ Created new MongoDB user from webhook: ${safeEmail} (${role})`
  );
  return user;
}

/**
 * Get or create user in MongoDB from Clerk user
 */
export async function getOrCreateMongoUser(clerkUserId) {
  await dbConnect();

  let user = await User.findOne({ clerkUserId });
  if (user) {
    // ✅ Do NOT call Clerk every request.
    // Only best-effort sync if user is restricted (throttled).
    if (shouldSyncRestricted(clerkUserId, !!user.restricted)) {
      await syncClerkRestrictedFlag(clerkUserId, true);
    }
    return user;
  }

  try {
    if (!clerk) throw new Error("CLERK_SECRET_KEY missing on server");

    // ✅ Stable backend Clerk call
    const clerkUser = await clerk.users.getUser(clerkUserId);

    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || "";
    const name =
      `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim() ||
      "User";

    const safeEmail = email || placeholderEmail(clerkUserId);

    const existingUser = await User.findOne({ email: safeEmail });

    if (existingUser) {
      if (
        existingUser.clerkUserId &&
        existingUser.clerkUserId !== clerkUserId
      ) {
        throw new Error("Email already linked to a different Clerk user");
      }

      existingUser.clerkUserId = clerkUserId;

      if (
        name &&
        name !== "User" &&
        (!existingUser.name || existingUser.name === "User")
      ) {
        existingUser.name = name;
      }

      const shouldBeAdmin = isAdminEmail(safeEmail);
      if (shouldBeAdmin && existingUser.role !== "admin") {
        existingUser.role = "admin";
      }

      await existingUser.save();

      // ✅ Keep Clerk metadata in sync (merge using known metadata)
      await syncClerkRestrictedFlag(
        clerkUserId,
        !!existingUser.restricted,
        clerkUser?.publicMetadata || {}
      );

      console.log(
        `✅ Linked existing MongoDB user to Clerk: ${safeEmail} (${existingUser.role})`
      );
      return existingUser;
    }

    const role = isAdminEmail(safeEmail) ? "admin" : "user";

    user = await safeCreateUser({
      clerkUserId,
      email: safeEmail,
      name,
      role,
    });

    // ✅ Keep Clerk metadata in sync (merge using known metadata)
    await syncClerkRestrictedFlag(
      clerkUserId,
      !!user.restricted,
      clerkUser?.publicMetadata || {}
    );

    console.log(`✅ Created new MongoDB user: ${safeEmail} (${role})`);
    return user;
  } catch (error) {
    console.error("Error creating/linking MongoDB user from Clerk:", error);

    const safeEmail = placeholderEmail(clerkUserId);

    const fallbackUser = await User.findOne({ clerkUserId });
    if (fallbackUser) {
      if (shouldSyncRestricted(clerkUserId, !!fallbackUser.restricted)) {
        await syncClerkRestrictedFlag(clerkUserId, !!fallbackUser.restricted);
      }
      return fallbackUser;
    }

    const created = await safeCreateUser({
      clerkUserId,
      email: safeEmail,
      name: "User",
      role: "user",
    });

    if (shouldSyncRestricted(clerkUserId, !!created.restricted)) {
      await syncClerkRestrictedFlag(clerkUserId, !!created.restricted);
    }

    return created;
  }
}

/**
 * requireAuth
 */
export async function requireAuth(req, res) {
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }

  const user = await getOrCreateMongoUser(userId);
  return { userId, user };
}

/**
 * Get user with role from MongoDB
 */
export async function getUserWithRole(clerkUserId) {
  await dbConnect();
  return await User.findOne({ clerkUserId });
}

/**
 * requireAdmin
 */
export async function requireAdmin(req, res) {
  const auth = await requireAuth(req, res);
  if (!auth) return null;

  if (auth.user.role !== "admin") {
    res
      .status(403)
      .json({ success: false, message: "Forbidden - Admin access required" });
    return null;
  }

  return auth;
}

export function withAdminAuth(handler) {
  return async (context) => {
    const { req } = context;
    const { userId } = getAuth(req);

    if (!userId) {
      return {
        redirect: { destination: "/auth/signin", permanent: false },
      };
    }

    const user = await getOrCreateMongoUser(userId);

    if (!user || user.role !== "admin") {
      return {
        redirect: { destination: "/dashboard", permanent: false },
      };
    }

    return handler(context);
  };
}
