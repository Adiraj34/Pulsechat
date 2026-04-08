import { NextResponse } from "next/server";
import { ApiError } from "@/backend/lib/errors";

export function json(data, init) {
  return NextResponse.json(data, init);
}

export function handleRoute(handler) {
  return async function routeHandler(request, context) {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            error: error.message,
            ...(error.details ? { details: error.details } : {}),
          },
          { status: error.status },
        );
      }

      console.error(error);
      return NextResponse.json(
        { error: "An unexpected server error occurred." },
        { status: 500 },
      );
    }
  };
}
