import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno";

serve(async (req) => {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err.message}`, {
      status: 400,
    });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const customerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id;

      if (customerId) {
        // Look up project by stripe_customer_id
        const { data: project } = await supabase
          .from("projects")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (project) {
          await supabase.from("payments").insert({
            project_id: project.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: "succeeded",
            stripe_payment_id: paymentIntent.id,
            description: paymentIntent.description || "Stripe payment",
          });
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const customerId =
        typeof paymentIntent.customer === "string"
          ? paymentIntent.customer
          : paymentIntent.customer?.id;

      if (customerId) {
        const { data: project } = await supabase
          .from("projects")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (project) {
          await supabase.from("payments").insert({
            project_id: project.id,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            status: "failed",
            stripe_payment_id: paymentIntent.id,
            description: paymentIntent.description || "Failed payment",
          });
        }
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        const { data: project } = await supabase
          .from("projects")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (project) {
          await supabase.from("payments").insert({
            project_id: project.id,
            amount: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency ?? "usd",
            status: "succeeded",
            stripe_payment_id: invoice.id,
            description: `Invoice ${invoice.number || invoice.id}`,
          });
        }
      }
      break;
    }

    default:
      // Unhandled event type
      break;
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
