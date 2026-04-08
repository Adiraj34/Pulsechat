import { ROLES } from "@/backend/constants";
import { requireActor, requireRoles } from "@/backend/auth";
import { notFound, badRequest } from "@/backend/lib/errors";
import { json, handleRoute } from "@/backend/lib/http";
import { deleteRecord, getRecordById, updateRecord } from "@/backend/records";
import { validateRecordPayload } from "@/backend/lib/validation";

function parseRecordId(params) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    throw badRequest("Record id must be a positive integer.");
  }

  return id;
}

export const GET = handleRoute(async function GET(request, { params }) {
  const actor = requireActor(request);
  requireRoles(actor, [ROLES.ANALYST, ROLES.ADMIN]);

  const record = getRecordById(parseRecordId(await params));
  if (!record) {
    throw notFound("Financial record not found.");
  }

  return json({ record });
});

export const PATCH = handleRoute(async function PATCH(request, { params }) {
  const actor = requireActor(request);
  requireRoles(actor, [ROLES.ADMIN]);

  const body = await request.json().catch(() => null);
  const record = updateRecord(
    parseRecordId(await params),
    validateRecordPayload(body || {}, { partial: true }),
  );

  return json({ record });
});

export const DELETE = handleRoute(async function DELETE(request, { params }) {
  const actor = requireActor(request);
  requireRoles(actor, [ROLES.ADMIN]);

  const deletedRecord = deleteRecord(parseRecordId(await params));
  return json({ deletedRecord });
});
