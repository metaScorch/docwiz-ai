"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Section from "@/components/ui/section";
import useWindowSize from "@/lib/hooks/use-window-size";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FaStar } from "react-icons/fa";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Button } from "@/components/ui/button";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2 } from "lucide-react";

const STRIPE_PRICE_IDS = {
  UNLIMITED: {
    monthly: "price_1QbiZ4JX4APU5HfwOKJBuBva",
    yearly: "price_1QbiZ4JX4APU5HfwZ4VX4VRb",
  },
};

const pricingPlans = [
  {
    name: "STARTER",
    href: "#",
    price: "$0",
    period: "month",
    yearlyPrice: "$0",
    features: [
      "3 Documents per Month",
      "3 AI Amendments per Document",
      "1 AutoFormat AI per Document",
      "3 AI Questions per Document",
      "Basic Templates",
    ],
    description: "Perfect for individuals trying out the platform",
    buttonText: "Current Plan",
    isPopular: false,
  },
  {
    name: "UNLIMITED",
    href: "#",
    price: "$19.99",
    period: "month",
    yearlyPrice: "$150",
    priceId: STRIPE_PRICE_IDS.UNLIMITED,
    features: [
      "Unlimited Documents",
      "Unlimited AI Amendments and Clause Editor",
      "Unlimited AutoFormat AI",
      "Unlimited AI Questions (Coming Soon)",
      "Premium Templates",
      "Collaboration Tools (Coming Soon)",
    ],
    description: "Ideal for professionals and businesses",
    buttonText: "Subscribe",
    isPopular: true,
  },
  {
    name: "ENTERPRISE",
    href: "#",
    price: "Let's Talk",
    period: "",
    yearlyPrice: "Let's Talk",
    features: [
      "Everything in Unlimited",
      "Advanced Collaboration Tools",
      "Custom API Integrations",
      "Enhanced Security & Compliance",
      "Dedicated Account Manager",
      "24/7 Priority Support",
      "Enterprise Analytics",
      "White Labeling Options",
    ],
    description: "For large organizations with complex workflows",
    buttonText: "Contact Sales",
    isPopular: false,
  },
];

export default function PricingPage() {
  const [isMonthly, setIsMonthly] = useState(true);
  const { isDesktop } = useWindowSize();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = () => {
    setIsMonthly(!isMonthly);
  };

  const handleSubscription = async (plan) => {
    if (plan.name === "ENTERPRISE") {
      window.open("https://tally.so/r/wgYL9K", "_blank");
      return;
    }

    if (plan.name !== "UNLIMITED") return;

    try {
      setIsLoading(true);
      console.log("1. Starting subscription process...");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.log("No session found, redirecting to sign-in");
        router.push("/sign-in");
        return;
      }
      console.log("2. User is authenticated");

      const { data: registration, error: registrationError } = await supabase
        .from("registrations")
        .select("stripe_customer_id")
        .eq("user_id", session.user.id)
        .single();

      let stripeCustomerId = registration?.stripe_customer_id;

      // Create Stripe customer if it doesn't exist
      if (!stripeCustomerId) {
        console.log("3. No Stripe customer found, creating new customer");
        const createCustomerResponse = await fetch(
          "/api/create-stripe-customer",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: session.user.email,
              userId: session.user.id,
            }),
          }
        );

        if (!createCustomerResponse.ok) {
          throw new Error("Failed to create Stripe customer");
        }

        const { customerId } = await createCustomerResponse.json();
        stripeCustomerId = customerId;

        // Update registration with new Stripe customer ID
        const { error: updateError } = await supabase
          .from("registrations")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", session.user.id);

        if (updateError) {
          throw new Error(
            "Failed to update registration with Stripe customer ID"
          );
        }
      }

      console.log(
        "4. Creating checkout session with price:",
        isMonthly ? plan.priceId.monthly : plan.priceId.yearly
      );

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: isMonthly ? plan.priceId.monthly : plan.priceId.yearly,
          customerId: stripeCustomerId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create checkout session");
      }

      const { sessionId } = await response.json();
      console.log("5. Got session ID:", sessionId);

      const stripe = await loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
      );
      if (!stripe) {
        throw new Error("Stripe failed to initialize");
      }
      console.log("6. Stripe loaded, redirecting to checkout...");

      const result = await stripe.redirectToCheckout({
        sessionId: sessionId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error("Error in subscription process:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <Link href="/dashboard">
          <Image
            src="/logo.png"
            alt="DocWiz Logo"
            width={180}
            height={60}
            priority
            className="h-auto"
          />
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              My Account
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/pricing")}>
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/sign-in");
              }}
              className="text-red-600"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Section title="Pricing" subtitle="Choose the plan that's right for you">
        <div className="flex justify-center mb-10">
          <span className="mr-2 font-semibold">Monthly</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <Label>
              <Switch checked={!isMonthly} onCheckedChange={handleToggle} />
            </Label>
          </label>
          <span className="ml-2 font-semibold">Yearly</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 0 }}
              whileInView={
                isDesktop
                  ? {
                      y: 0,
                      opacity: 1,
                      x:
                        index === pricingPlans.length - 1
                          ? -30
                          : index === 0
                            ? 30
                            : 0,
                      scale:
                        index === 0 || index === pricingPlans.length - 1
                          ? 0.94
                          : 1.0,
                    }
                  : { y: 0, opacity: 1 }
              }
              viewport={{ once: true }}
              transition={{
                duration: 0.6,
                type: "spring",
                stiffness: 100,
                damping: 30,
                delay: index * 0.1,
              }}
              className={cn(
                "rounded-2xl border p-6 bg-background text-center relative",
                plan.isPopular ? "border-primary border-2" : "border-border"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                  <FaStar className="text-white" />
                  <span className="text-white ml-1 font-sans font-semibold">
                    Popular
                  </span>
                </div>
              )}
              {!isMonthly && plan.name === "UNLIMITED" && (
                <div className="absolute top-0 left-0 bg-green-600 py-0.5 px-2 rounded-br-xl rounded-tl-xl">
                  <span className="text-white font-sans font-semibold text-sm">
                    Save 37%
                  </span>
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-muted-foreground">
                  {plan.name}
                </p>
                <p className="mt-6 flex items-center justify-center gap-x-2">
                  <span className="text-5xl font-bold tracking-tight text-foreground">
                    {isMonthly ? plan.price : plan.yearlyPrice}
                  </span>
                  {plan.period !== "" && (
                    <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                      {isMonthly ? `/ ${plan.period}` : "/ year"}
                    </span>
                  )}
                </p>

                <p className="text-xs leading-5 text-muted-foreground">
                  {plan.price !== "Let's Talk" &&
                    plan.name !== "STARTER" &&
                    (isMonthly
                      ? "billed monthly"
                      : plan.name === "UNLIMITED"
                        ? "billed annually (effective $12.5/month, save 37%)"
                        : "billed annually")}
                </p>

                <ul className="mt-5 gap-2 flex flex-col">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <hr className="w-full my-4" />

                <button
                  onClick={() => handleSubscription(plan)}
                  disabled={isLoading}
                  className={cn(
                    buttonVariants({
                      variant: "outline",
                    }),
                    "w-full relative",
                    plan.isPopular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "",
                    isLoading && "cursor-not-allowed opacity-50"
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                      Please wait...
                    </>
                  ) : (
                    plan.buttonText
                  )}
                </button>
                <p className="mt-6 text-xs leading-5 text-muted-foreground">
                  {plan.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>
    </div>
  );
}
