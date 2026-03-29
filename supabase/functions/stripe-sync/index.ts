import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

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

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get project's Stripe customer ID
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("stripe_customer_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "Project has no linked Stripe customer" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent payment intents from Stripe
    const paymentIntents = await stripe.paymentIntents.list({
      customer: project.stripe_customer_id,
      limit: 50,
    });

    let synced = 0;

    for (const pi of paymentIntents.data) {
      if (pi.status !== "succeeded") continue;

      // Check if we already have this payment
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("stripe_payment_id", pi.id)
        .single();

      if (!existing) {
        await supabase.from("payments").insert({
          project_id,
          amount: pi.amount / 100,
          currency: pi.currency,
          status: "succeeded",
          stripe_payment_id: pi.id,
          description: pi.description || "Synced from Stripe",
        });
        synced++;
      }
    }

    return new Response(
      JSON.stringify({ synced, total: paymentIntents.data.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
