import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getCertificateById = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) =>
    z.object({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("certificates")
      .select(
        "id,video_id,video_title,channel,thumbnail_url,difficulty,score,total_questions,topics,recipient_name,created_at",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Certificate not found");
    return { certificate: row };
  });

const SaveSchema = z.object({
  video_id: z.string().min(1).max(100),
  video_title: z.string().min(1).max(1000),
  channel: z.string().max(500).optional().nullable(),
  thumbnail_url: z.string().max(1000).optional().nullable(),
  difficulty: z.enum(["beginner", "intermediate", "expert"]),
  score: z.number().int().min(0).max(100),
  total_questions: z.number().int().min(1).max(100),
  topics: z.array(z.string().max(200)).max(50).default([]),
  recipient_name: z.string().min(1).max(256),
});

export const saveCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("certificates")
      .insert({ ...data, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const listCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("certificates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { certificates: data ?? [] };
  });

export const deleteCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("certificates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
