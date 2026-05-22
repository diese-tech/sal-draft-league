import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });

  // Verify report exists
  const { data: report, error: reportErr } = await supabase
    .from("match_reports")
    .select("id, screenshot_urls")
    .eq("id", id)
    .single();
  if (reportErr || !report) return NextResponse.json({ error: "Report not found." }, { status: 404 });

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const files = formData.getAll("screenshots") as File[];
  if (files.length === 0) return NextResponse.json({ error: "No screenshots provided." }, { status: 400 });
  if (files.length > 5) return NextResponse.json({ error: "Maximum 5 screenshots allowed." }, { status: 400 });

  const existingUrls = ((report as { screenshot_urls: string[] }).screenshot_urls) ?? [];
  const newUrls: string[] = [];

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("match-screenshots")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr.message);
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from("match-screenshots").getPublicUrl(path);
    newUrls.push(urlData.publicUrl);
  }

  const allUrls = [...existingUrls, ...newUrls];
  const { error: updateErr } = await supabase
    .from("match_reports")
    .update({ screenshot_urls: allUrls, status: "pending" })
    .eq("id", id);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ urls: newUrls, allUrls });
}
