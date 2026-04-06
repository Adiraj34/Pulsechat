import { NextResponse } from "next/server";
import {
  deleteMessageForEveryone,
  getMessageById,
  hideMessageForUser,
} from "@/backend/messages";

function invalidIdResponse() {
  return NextResponse.json({ error: "Invalid message id." }, { status: 400 });
}

export async function DELETE(request, context) {
  const { id } = await context.params;
  const messageId = Number(id);

  if (!Number.isInteger(messageId) || messageId <= 0) {
    return invalidIdResponse();
  }

  const message = getMessageById(messageId);

  if (!message) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  if (scope === "me") {
    const userId = String(searchParams.get("userId") || "").trim();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required for delete-for-me." },
        { status: 400 },
      );
    }

    hideMessageForUser(messageId, userId);
    return NextResponse.json({ success: true, scope: "me" });
  }

  if (scope === "everyone") {
    deleteMessageForEveryone(messageId);
    return NextResponse.json({ success: true, scope: "everyone" });
  }

  return NextResponse.json(
    { error: "scope must be either 'me' or 'everyone'." },
    { status: 400 },
  );
}
