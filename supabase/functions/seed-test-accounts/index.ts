// One-shot endpoint to provision the two test accounts with known passwords
// and assigned roles. Idempotent — safe to call multiple times.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Seed {
  email: string;
  password: string;
  full_name: string;
  role: "super_admin" | "admin" | "team_member" | "viewer";
  department?: string;
}

const SEEDS: Seed[] = [
  {
    email: "david.oludepo@gmail.com",
    password: "159632",
    full_name: "David Oludepo",
    role: "super_admin",
    department: "Leadership",
  },
  {
    email: "ogundepo.david@lmu.edu.ng",
    password: "159632",
    full_name: "David Ogundepo",
    role: "team_member",
    department: "Engineering",
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

    const results: any[] = [];

    for (const s of SEEDS) {
      // Find existing user by email
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = list?.users.find((u) => u.email?.toLowerCase() === s.email.toLowerCase());

      let userId: string;
      if (existing) {
        const { data: upd, error } = await admin.auth.admin.updateUserById(existing.id, {
          password: s.password,
          email_confirm: true,
          user_metadata: { full_name: s.full_name },
        });
        if (error) throw error;
        userId = upd.user!.id;
        results.push({ email: s.email, action: "updated", id: userId });
      } else {
        const { data: created, error } = await admin.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
          user_metadata: { full_name: s.full_name },
        });
        if (error) throw error;
        userId = created.user!.id;
        results.push({ email: s.email, action: "created", id: userId });
      }

      // Upsert profile with role + department
      const { error: pErr } = await admin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: s.email,
            full_name: s.full_name,
            role: s.role,
            department: s.department ?? null,
          },
          { onConflict: "id" },
        );
      if (pErr) throw pErr;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-test-accounts error", e);
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
