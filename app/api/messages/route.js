import { NextResponse } from "next/server";
import { createMessage, listMessages } from "@/lib/messages";

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return badRequest("userId is required.");
  }

  return NextResponse.json({ messages: listMessages(userId) });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);

  if (!body) {
    return badRequest("A valid JSON body is required.");
  }

  const senderId = String(body.senderId || "").trim();
  const senderName = String(body.senderName || "").trim();
  const content = String(body.content || "").trim();

  if (!senderId || !senderName) {
    return badRequest("senderId and senderName are required.");
  }

  if (!content) {
    return badRequest("Message content cannot be empty.");
  }

  if (content.length > 500) {
    return badRequest("Message content must be 500 characters or fewer.");
  }

  const message = createMessage({ senderId, senderName, content });
  return NextResponse.json({ message }, { status: 201 });
}
