import { ROLES, USER_STATUSES } from "@/backend/constants";
import { requireActor, requireRoles } from "@/backend/auth";
import { json, handleRoute } from "@/backend/lib/http";
import { createUser, listUsers } from "@/backend/users";
import { validateUserPayload } from "@/backend/lib/validation";

export const GET = handleRoute(async function GET(request) {
  requireActor(request);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  return json({ users: listUsers({ status: status || undefined }) });
});

export const POST = handleRoute(async function POST(request) {
  const actor = requireActor(request);
  requireRoles(actor, [ROLES.ADMIN]);

  const body = await request.json().catch(() => null);
  const user = createUser({
    status: USER_STATUSES.ACTIVE,
    ...validateUserPayload(body || {}, { partial: false }),
  });

  return json({ user }, { status: 201 });
});
