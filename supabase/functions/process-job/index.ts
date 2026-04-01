import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Auth check
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { job_id } = await req.json();
    if (!job_id) throw new Error("job_id is required");

    // Admin client for updates
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check usage limit: 1 completed generation per user
    const { count } = await adminClient
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["ready", "approved", "posted"]);

    if ((count ?? 0) >= 1) {
      return new Response(
        JSON.stringify({ error: "POC limit reached. You get 1 free generation." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the job
    const { data: job, error: jobError } = await adminClient
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .eq("user_id", user.id)
      .single();

    if (jobError || !job) throw new Error("Job not found");

    // Update to running
    await adminClient.from("jobs").update({ status: "running" }).eq("id", job_id);

    // Build prompt based on flow
    const flowPrompts: Record<string, string> = {
      linkedin: `You are a legal content writer for a Delhi-based lawyer's LinkedIn profile. Generate a professional LinkedIn post based on the following input. The post should:
- Start with a strong hook (first line grabs attention)
- Be 150-250 words
- Include relevant legal analysis from an Indian law perspective
- End with a call-to-action (engage, comment, share)
- Include 3-5 relevant hashtags
- Tone: authoritative yet accessible

IMPORTANT: End with this disclaimer on a new line:
"⚖️ This content is legal commentary for public awareness only and does not constitute legal advice."

Input (${job.input_mode}): ${job.input_text}`,

      short_video: `You are a script writer for a 45-60 second legal commentary video for Instagram Reels/YouTube Shorts. The speaker is a Delhi-based lawyer. Generate a video script based on the following input. The script should:
- Open with a hook question or bold statement (first 3 seconds)
- Be conversational and energetic
- Cover ONE key legal point clearly
- End with "Follow for more legal insights"
- Include [VISUAL CUE] notes in brackets for on-screen text
- Target duration: 45-60 seconds when read aloud

IMPORTANT: Include this spoken disclaimer at the end:
"Remember, this is legal commentary only, not legal advice."

Input (${job.input_mode}): ${job.input_text}`,

      youtube_long: `You are a script writer for a 5-8 minute YouTube video on Indian law. The speaker is a Delhi-based lawyer. Generate a full video script with 3 chapters based on the following input. The script should:
- Chapter 1: Context & Background (1-2 min) — what happened and why it matters
- Chapter 2: Legal Analysis (2-3 min) — relevant laws, sections, precedents
- Chapter 3: Practical Impact (1-2 min) — what this means for common people
- Include [TIMESTAMP] markers for each chapter
- Include [B-ROLL] suggestions for visual cuts
- Conversational but authoritative tone

IMPORTANT: Include this spoken disclaimer at the end:
"This video is legal commentary for public awareness only and does not constitute legal advice. For advice specific to your situation, consult a qualified lawyer."

Input (${job.input_mode}): ${job.input_text}`,
    };

    const systemPrompt = flowPrompts[job.flow] || flowPrompts.linkedin;

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate the content now. Input: ${job.input_text}` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await adminClient.from("jobs").update({ status: "failed", error: "AI rate limited. Try again shortly." }).eq("id", job_id);
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await adminClient.from("jobs").update({ status: "failed", error: "AI credits exhausted." }).eq("id", job_id);
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("jobs").update({ status: "failed", error: "AI generation failed" }).eq("id", job_id);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      await adminClient.from("jobs").update({ status: "failed", error: "No content generated" }).eq("id", job_id);
      throw new Error("Empty AI response");
    }

    // Determine output type and save
    if (job.flow === "linkedin") {
      await adminClient.from("job_outputs").insert({
        job_id,
        output_type: "linkedin_post",
        content,
      });
    } else {
      // For video flows, save the script AND a demo video
      const videoUrls: Record<string, string> = {
        short_video: "https://d990b259-68f4-4355-97f8-532ab033f81d.lovableproject.com/__l5e/assets-v1/1d8602a4-720c-4a97-a953-ee96ef866ccf/demo-short-video.mp4",
        youtube_long: "https://d990b259-68f4-4355-97f8-532ab033f81d.lovableproject.com/__l5e/assets-v1/3c32420e-5e1a-4f2c-a7ac-d952132cacd1/demo-long-video.mp4",
      };

      // Insert script
      await adminClient.from("job_outputs").insert({
        job_id,
        output_type: "video_script",
        content,
      });

      // Insert video reference
      await adminClient.from("job_outputs").insert({
        job_id,
        output_type: "video",
        file_path: videoUrls[job.flow] || videoUrls.short_video,
        metadata: { demo: true, note: "POC demo video — personalized avatar videos available with HeyGen integration" },
      });
    }

    // Mark ready
    await adminClient.from("jobs").update({ status: "ready" }).eq("id", job_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-job error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
