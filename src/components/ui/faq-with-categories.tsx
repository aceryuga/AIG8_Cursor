"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqSectionWithCategoriesProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  items: {
    question: string;
    answer: string;
    category?: string;
  }[];
  contactInfo?: {
    title: string;
    description?: string;
    buttonText: string;
    onContact?: () => void;
  };
}

const FaqSectionWithCategories = React.forwardRef<HTMLElement, FaqSectionWithCategoriesProps>(
  ({ className, title, description, items, contactInfo, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={cn("py-16 w-full bg-[#F9F7E7]", className)}
        {...props}
      >
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl font-bold text-[#053725]">
                {title}
              </h2>
              {description && (
                <p className="text-[#053725]/70 text-lg">
                  {description}
                </p>
              )}
            </div>

            {/* FAQ Items */}
            <Accordion type="single" collapsible className="space-y-4">
              {items.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className={cn(
                    "mb-4 rounded-xl border-none",
                    "bg-white/80 backdrop-blur-sm",
                    "shadow-lg neumorphic"
                  )}
                >
                  <AccordionTrigger 
                    className={cn(
                      "px-6 py-4 text-left hover:no-underline",
                      "data-[state=open]:border-b data-[state=open]:border-[#053725]/10"
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      {item.category && (
                        <Badge
                          variant="secondary"
                          className="w-fit text-xs font-normal bg-[#053725]/10 text-[#053725] hover:bg-[#053725]/20"
                        >
                          {item.category}
                        </Badge>
                      )}
                      <h3 className="text-lg font-medium text-[#053725] group-hover:text-[#053725]/80">
                        {item.question}
                      </h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pt-4 pb-6">
                    <p className="text-[#053725]/70 leading-relaxed">
                      {item.answer}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Contact Section */}
            {contactInfo && (
              <div className="mt-12 text-center p-8 rounded-2xl bg-white/50 backdrop-blur-sm border border-[#053725]/10 neumorphic">
                <p className="text-[#053725] text-lg font-semibold mb-4">
                  {contactInfo.title}
                </p>
                {contactInfo.description && (
                  <p className="text-sm text-[#053725]/70 mb-6">
                    {contactInfo.description}
                  </p>
                )}
                <Button 
                  size="lg" 
                  onClick={contactInfo.onContact}
                  className="bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] hover:shadow-[0_8px_32px_rgba(5,55,37,0.4)] transition-all duration-300 neumorphic"
                >
                  {contactInfo.buttonText}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }
);
FaqSectionWithCategories.displayName = "FaqSectionWithCategories";

export { FaqSectionWithCategories };