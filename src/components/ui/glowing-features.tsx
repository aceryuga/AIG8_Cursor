"use client";

import { ArrowLeftRight, IndianRupee, FileText, BarChart3, Bot, Lock } from "lucide-react";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { cn } from "@/lib/utils";

export function GlowingFeatures() {
  return (
    <div className="pt-0 pb-16">
      <div className="text-center mb-14">
        <h2 className="text-4xl md:text-5xl font-bold text-[#053725] mb-4">
          Your Entire Portfolio, Clearly Managed
        </h2>
        <p className="text-xl text-[#053725]/70 max-w-2xl mx-auto">
          From tedious payment matching to critical document tracking, PropertyPro offers a comprehensive suite of tools designed to put you in control
        </p>
      </div>
      
      <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2">
        <GridItem
          area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
          icon={<ArrowLeftRight className="h-4 w-4" />}
          title="Faster Reconcile"
          description="Match bank statements to rent in minutes with AI suggestions and manual fallback."
        />
        <GridItem
          area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
          icon={<IndianRupee className="h-4 w-4" />}
          title="Zero Missed Rent"
          description="See due/overdue at a glance and trigger automatic tenant reminders."
        />
        <GridItem
          area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
          icon={<Lock className="h-4 w-4" />}
          title="One Vault"
          description="Keep leases, receipts, and photos together with renewal alerts built in."
        />
        <GridItem
          area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
          icon={<BarChart3 className="h-4 w-4" />}
          title="Portfolio Clarity"
          description="Track cash collected, outstanding, and occupancy with action cards."
        />
        <GridItem
          area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
          icon={<Bot className="h-4 w-4" />}
          title="AI On Call"
          description="Ask 'Who's late?' or 'Yield this month?' and get instant, data-backed answers."
        />
      </ul>
    </div>
  );
}

interface GridItemProps {
  area: string;
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
  return (
    <li className={cn("min-h-[12rem] list-none", area)}>
      <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-[#053725]/20 p-2 md:rounded-[1.5rem] md:p-3">
        <GlowingEffect
          spread={40}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
          borderWidth={3}
        />
        <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-xl border-[0.75px] bg-[#F9F7E7] p-4 shadow-sm md:p-5">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <div className="w-fit rounded-lg border-[0.75px] border-[#053725]/20 bg-[#053725]/5 p-2">
              {icon}
            </div>
            <div className="space-y-2">
              <h3 className="pt-0.5 text-2xl leading-[1.375rem] font-semibold font-sans tracking-[-0.04em] md:text-3xl md:leading-[1.875rem] text-balance text-[#053725]">
                {title}
              </h3>
              <h2 className="[&_b]:md:font-semibold [&_strong]:md:font-semibold font-sans text-base leading-[1.125rem] md:text-lg md:leading-[1.375rem] text-[#053725]/70">
                {description}
              </h2>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
};