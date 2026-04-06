import { NextResponse } from "next/server";
import { getMessageById, setPinnedState } from "@/lib/messages";

function invalidIdResponse() {
  return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
}

export async function PATCH(request, context) {
  const { id } = await context.params;
  const messageId = Number(id);

  if (!Number.isInteger(messageId) || messageId <= 0) {
    return invalidIdResponse();
  }

  const body = await request.json().catch(() => null);

  if (!body || typeof body.pinned !== "boolean") {
    return NextResponse.json({ error: "A boolean 'pinned' field is required." }, { status: 400 });
  }

  const message = getMessageById(messageId);

  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  setPinnedState(messageId, body.pinned);
  return NextResponse.json({ success: true, pinned: body.pinned });
}
