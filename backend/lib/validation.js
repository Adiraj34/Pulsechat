import { RECORD_TYPES, ROLES, USER_STATUSES } from "@/backend/constants";
import { badRequest } from "@/backend/lib/errors";

function isValidDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

export function normalizePagination(searchParams) {
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("pageSize") || 10);

  if (!Number.isInteger(page) || page < 1) {
    throw badRequest("page must be a positive integer.");
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw badRequest("pageSize must be an integer between 1 and 100.");
  }

  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function validateUserPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("A valid JSON body is required.");
  }

  const data = {};

  if (!partial || payload.name !== undefined) {
    const name = String(payload.name || "").trim();
    if (!name) {
      throw badRequest("name is required.");
    }
    if (name.length > 80) {
      throw badRequest("name must be 80 characters or fewer.");
    }
    data.name = name;
  }

  if (!partial || payload.email !== undefined) {
    const email = String(payload.email || "").trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      throw badRequest("email is required.");
    }
    if (!emailPattern.test(email)) {
      throw badRequest("email must be a valid email address.");
    }
    data.email = email;
  }

  if (!partial || payload.role !== undefined) {
    const role = String(payload.role || "").trim().toLowerCase();
    if (!Object.values(ROLES).includes(role)) {
      throw badRequest("role must be viewer, analyst, or admin.");
    }
    data.role = role;
  }

  if (payload.status !== undefined) {
    const status = String(payload.status || "").trim().toLowerCase();
    if (!Object.values(USER_STATUSES).includes(status)) {
      throw badRequest("status must be active or inactive.");
    }
    data.status = status;
  }

  return data;
}

export function validateRecordPayload(payload, { partial = false } = {}) {
  if (!payload || typeof payload !== "object") {
    throw badRequest("A valid JSON body is required.");
  }

  const data = {};

  if (!partial || payload.amount !== undefined) {
    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw badRequest("amount must be a number greater than 0.");
    }
    data.amount = Number(amount.toFixed(2));
    data.amountCents = Math.round(data.amount * 100);
  }

  if (!partial || payload.type !== undefined) {
    const type = String(payload.type || "").trim().toLowerCase();
    if (!Object.values(RECORD_TYPES).includes(type)) {
      throw badRequest("type must be income or expense.");
    }
    data.type = type;
  }

  if (!partial || payload.category !== undefined) {
    const category = String(payload.category || "").trim();
    if (!category) {
      throw badRequest("category is required.");
    }
    if (category.length > 50) {
      throw badRequest("category must be 50 characters or fewer.");
    }
    data.category = category;
  }

  if (!partial || payload.date !== undefined) {
    const date = String(payload.date || "").trim();
    if (!isValidDateInput(date)) {
      throw badRequest("date must be in YYYY-MM-DD format.");
    }
    data.date = date;
  }

  if (!partial || payload.notes !== undefined) {
    const notes = String(payload.notes || "").trim();
    if (notes.length > 280) {
      throw badRequest("notes must be 280 characters or fewer.");
    }
    data.notes = notes;
  }

  return data;
}

export function validateRecordFilters(searchParams) {
  const filters = {};
  const type = searchParams.get("type");
  const category = searchParams.get("category");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const search = searchParams.get("search");

  if (type) {
    const normalizedType = type.trim().toLowerCase();
    if (!Object.values(RECORD_TYPES).includes(normalizedType)) {
      throw badRequest("type filter must be income or expense.");
    }
    filters.type = normalizedType;
  }

  if (category) {
    filters.category = category.trim();
  }

  if (dateFrom) {
    if (!isValidDateInput(dateFrom.trim())) {
      throw badRequest("dateFrom must be in YYYY-MM-DD format.");
    }
    filters.dateFrom = dateFrom.trim();
  }

  if (dateTo) {
    if (!isValidDateInput(dateTo.trim())) {
      throw badRequest("dateTo must be in YYYY-MM-DD format.");
    }
    filters.dateTo = dateTo.trim();
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw badRequest("dateFrom cannot be later than dateTo.");
  }

  if (search) {
    filters.search = search.trim();
  }

  return filters;
}
