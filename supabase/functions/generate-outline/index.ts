import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { project_id } = await req.json();

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("company_name, industry, notes")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch voice responses for context
    const { data: voiceResponses } = await supabase
      .from("voice_responses")
      .select("question, transcript")
      .eq("project_id", project_id)
      .order("created_at", { ascending: true });

    // Build context string
    let context = `Company: ${project.company_name}\n`;
    if (project.industry) context += `Industry: ${project.industry}\n`;
    if (project.notes) context += `Notes: ${project.notes}\n`;

    if (voiceResponses && voiceResponses.length > 0) {
      context += "\nVoice Responses:\n";
      for (const vr of voiceResponses) {
        if (vr.transcript) {
          context += `Q: ${vr.question}\nA: ${vr.transcript}\n\n`;
        }
      }
    }

    // Generate outline using OpenAI
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are a senior web strategist at Vision Software, a web design agency. " +
                "Given information about a client, generate a detailed website outline in Markdown. " +
                "Include suggested pages, sections, key messaging, calls-to-action, and any technical recommendations. " +
                "Be specific and actionable.",
            },
            {
              role: "user",
              content: `Generate a website outline for this client:\n\n${context}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      }
    );

    const openaiData = await openaiResponse.json();
    const outlineContent =
      openaiData.choices?.[0]?.message?.content ?? "Failed to generate outline.";

    // Save the outline
    const { data: outline, error: insertError } = await supabase
      .from("outlines")
      .insert({
        project_id,
        content: outlineContent,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(outline), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
