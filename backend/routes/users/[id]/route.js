import { ROLES } from "@/backend/constants";
import { requireActor, requireRoles } from "@/backend/auth";
import { notFound, badRequest } from "@/backend/lib/errors";
import { json, handleRoute } from "@/backend/lib/http";
import { getUserById, updateUser } from "@/backend/users";
import { validateUserPayload } from "@/backend/lib/validation";

function parseUserId(params) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    throw badRequest("User id must be a positive integer.");
  }

  return id;
}

export const GET = handleRoute(async function GET(request, { params }) {
  requireActor(request);
  const user = getUserById(parseUserId(await params));

  if (!user) {
    throw notFound("User not found.");
  }

  return json({ user });
});

export const PATCH = handleRoute(async function PATCH(request, { params }) {
  const actor = requireActor(request);
  requireRoles(actor, [ROLES.ADMIN]);

  const body = await request.json().catch(() => null);
  const user = updateUser(
    parseUserId(await params),
    validateUserPayload(body || {}, { partial: true }),
  );

  return json({ user });
});
