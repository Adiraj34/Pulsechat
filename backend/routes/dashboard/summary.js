import { ROLES } from "@/backend/constants";
import { requireActor, requireRoles } from "@/backend/auth";
import { handleRoute, json } from "@/backend/lib/http";
import { badRequest } from "@/backend/lib/errors";
import { getDashboardSummary } from "@/backend/dashboard";

export const GET = handleRoute(async function GET(request) {
  const actor = requireActor(request);
  requireRoles(actor, [ROLES.VIEWER, ROLES.ANALYST, ROLES.ADMIN]);

  const { searchParams } = new URL(request.url);
  const months = Number(searchParams.get("months") || 6);

  if (!Number.isInteger(months) || months < 1 || months > 12) {
    throw badRequest("months must be an integer between 1 and 12.");
  }

  return json({ summary: getDashboardSummary({ months }) });
});
