import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "connected" });
  } catch (err) {
    return NextResponse.json({ ok: false, db: "error", error: String(err) }, { status: 500 });
  }
}