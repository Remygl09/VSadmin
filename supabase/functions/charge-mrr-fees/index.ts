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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active projects with MRR and a Stripe customer
    const { data: projects, error } = await supabase
      .from("projects")
      .select("id, company_name, mrr_amount, stripe_customer_id")
      .eq("is_archived", false)
      .not("mrr_amount", "is", null)
      .not("stripe_customer_id", "is", null)
      .gt("mrr_amount", 0);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{
      project_id: string;
      company_name: string;
      amount: number;
      status: string;
      error?: string;
    }> = [];

    for (const project of projects ?? []) {
      try {
        // Create a payment intent for the MRR amount
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round((project.mrr_amount ?? 0) * 100),
          currency: "usd",
          customer: project.stripe_customer_id!,
          description: `Monthly recurring fee - ${project.company_name}`,
          metadata: { project_id: project.id },
          confirm: true,
          off_session: true,
          payment_method_types: ["card"],
        });

        // Record the payment
        await supabase.from("payments").insert({
          project_id: project.id,
          amount: project.mrr_amount ?? 0,
          currency: "usd",
          status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
          stripe_payment_id: paymentIntent.id,
          description: `MRR charge - ${project.company_name}`,
        });

        results.push({
          project_id: project.id,
          company_name: project.company_name,
          amount: project.mrr_amount ?? 0,
          status: paymentIntent.status,
        });
      } catch (chargeErr) {
        results.push({
          project_id: project.id,
          company_name: project.company_name,
          amount: project.mrr_amount ?? 0,
          status: "failed",
          error: chargeErr.message,
        });
      }
    }

    return new Response(
      JSON.stringify({ charged: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
