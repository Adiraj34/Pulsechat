import { ROLES } from "@/backend/constants";
import { requireActor, requireRoles } from "@/backend/auth";
import { json, handleRoute } from "@/backend/lib/http";
import { createRecord, listCategories, listRecords } from "@/backend/records";
import {
  normalizePagination,
  validateRecordFilters,
  validateRecordPayload,
} from "@/backend/lib/validation";

export const GET = handleRoute(async function GET(request) {
  const actor = requireActor(request);
  requireRoles(actor, [ROLES.ANALYST, ROLES.ADMIN]);

  const { searchParams } = new URL(request.url);
  const filters = validateRecordFilters(searchParams);
  const pagination = normalizePagination(searchParams);
  const result = listRecords({ filters, pagination });

  return json({
    ...result,
    filters,
    categories: listCategories(),
  });
});

export const POST = handleRoute(async function POST(request) {
  const actor = requireActor(request);
  requireRoles(actor, [ROLES.ADMIN]);

  const body = await request.json().catch(() => null);
  const payload = validateRecordPayload(body || {}, { partial: false });
  const record = createRecord({ ...payload, createdByUserId: actor.id });

  return json({ record }, { status: 201 });
});
