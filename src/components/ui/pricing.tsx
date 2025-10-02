"use client";

import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          "#053725",
          "#ec632f",
          "#F9F7E7",
          "#053725",
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="container py-20 bg-[#F9F7E7]">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-[#053725]">
          {title}
        </h2>
        <p className="text-[#053725]/70 text-lg whitespace-pre-line">
          {description}
        </p>
      </div>

      <div className="flex justify-center items-center mb-16 gap-4">
        <div className="relative flex items-center bg-white/50 backdrop-blur-sm border-2 border-[#053725]/20 rounded-full p-1 neumorphic">
          <button
            onClick={() => handleToggle(false)}
            className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
              isMonthly
                ? "text-[#F9F7E7] bg-gradient-to-r from-[#053725] to-[#053725]/90 shadow-lg"
                : "text-[#053725] hover:text-[#053725]/80"
            }`}
          >
            Monthly
          </button>
          <button
            ref={switchRef as any}
            onClick={() => handleToggle(true)}
            className={`relative z-10 px-6 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
              !isMonthly
                ? "text-[#F9F7E7] bg-gradient-to-r from-[#053725] to-[#053725]/90 shadow-lg"
                : "text-[#053725] hover:text-[#053725]/80"
            }`}
          >
            Annual <span className="text-[#ec632f]">(Save 20%)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <motion.div
            key={index}
            initial={{ y: 50, opacity: 0 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                  }
                : { y: 0, opacity: 1 }
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              `rounded-2xl border-2 p-8 bg-white/80 backdrop-blur-sm text-center relative shadow-lg`,
              plan.isPopular ? "border-[#053725] neumorphic" : "border-[#053725]/20",
              "flex flex-col",
              !plan.isPopular && "mt-5",
              index === 0 || index === 2
                ? "z-0 transform translate-x-0 translate-y-0"
                : "z-10"
            )}
          >
            {plan.isPopular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#053725] to-[#053725]/90 py-2 px-6 rounded-full flex items-center shadow-lg">
                <Star className="text-[#F9F7E7] h-4 w-4 fill-current" />
                <span className="text-[#F9F7E7] ml-2 font-semibold text-sm">
                  Most Popular
                </span>
              </div>
            )}
            <div className="flex-1 flex flex-col">
              <p className="text-lg font-bold text-[#053725] mb-2">
                {plan.name}
              </p>
              <div className="mt-6 flex items-center justify-center gap-x-2">
                <span className="text-5xl font-bold tracking-tight text-[#053725]">
                  <NumberFlow
                    value={
                      isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)
                    }
                    format={{
                      style: "currency",
                      currency: "INR",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    }}
                    formatter={(value) => `₹${value}`}
                    transformTiming={{
                      duration: 500,
                      easing: "ease-out",
                    }}
                    willChange
                    className="font-variant-numeric: tabular-nums"
                  />
                </span>
                {/* removed inline unit to avoid "/" next to the price */}
                {null}
              </div>

              <p className="text-sm leading-5 text-[#053725]/60 mb-6">
                {isMonthly ? "billed monthly" : "billed annually"}
              </p>

              <ul className="mt-6 gap-3 flex flex-col text-left">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-[#053725] mt-0.5 flex-shrink-0" strokeWidth={2} />
                    <span className="text-[#053725]/80 leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-6 border-t border-[#053725]/10">
                <a
                  href={plan.href}
                  className={cn(
                    "w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-300 neumorphic inline-block",
                    plan.isPopular
                      ? "bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] hover:shadow-[0_8px_32px_rgba(5,55,37,0.4)]"
                      : "bg-white border-2 border-[#053725] text-[#053725] hover:bg-[#053725] hover:text-[#F9F7E7] hover:shadow-[0_8px_32px_rgba(5,55,37,0.2)]"
                  )}
                >
                  {plan.buttonText}
                </a>
                <p className="mt-4 text-sm leading-5 text-[#053725]/60">
                  {plan.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}