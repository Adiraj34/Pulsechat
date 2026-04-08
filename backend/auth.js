import { ROLES, USER_STATUSES } from "@/backend/constants";
import { forbidden, unauthorized } from "@/backend/lib/errors";
import { getUserById } from "@/backend/users";

export function getActorId(request) {
  const headerUserId = request.headers.get("x-user-id");
  if (headerUserId) {
    return Number(headerUserId);
  }

  const { searchParams } = new URL(request.url);
  const queryUserId = searchParams.get("actingUserId");
  return queryUserId ? Number(queryUserId) : null;
}

export function requireActor(request) {
  const actorId = getActorId(request);
  if (!actorId || !Number.isInteger(actorId)) {
    throw unauthorized("Provide an active user context through x-user-id.");
  }

  const actor = getUserById(actorId);
  if (!actor) {
    throw unauthorized("The requested acting user does not exist.");
  }

  if (actor.status !== USER_STATUSES.ACTIVE) {
    throw forbidden("Inactive users cannot access the dashboard.");
  }

  return actor;
}

export function requireRoles(actor, allowedRoles) {
  if (!allowedRoles.includes(actor.role)) {
    throw forbidden("Your role does not allow this action.");
  }
}

export function canManageUsers(actor) {
  return actor.role === ROLES.ADMIN;
}
