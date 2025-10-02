import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { motion } from "motion/react";

const testimonials = [
  {
    text: "PropertyPro took me off spreadsheets. Rent tracking and renewals are finally on autopilot.",
    image: "https://randomuser.me/api/portraits/women/3.jpg",
    name: "Vanda Lengyel",
    role: "Head of Operations",
  },
  {
    text: "UPI references used to be chaos. Now invoices, payments, and the ledger line up in minutes.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&h=150&auto=format&fit=crop&crop=face",
    name: "Karthik SV",
    role: "Founder",
  },
  {
    text: "I actually know my cash flow and ROI per property—without late-night accounting.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&h=150&auto=format&fit=crop&crop=face",
    name: "Hari",
    role: "Director",
  },
  {
    text: "Receipts with AI field extraction cut our manual entry to near zero.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&h=150&auto=format&fit=crop&crop=face",
    name: "Mayank",
    role: "Senior Manager",
  },
  {
    text: "Its robust features and quick support have transformed our workflow, making us significantly more efficient.",
    image: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=150&h=150&auto=format&fit=crop&crop=face",
    name: "Farhan Siddiqui",
    role: "Project Manager",
  },
  {
    text: "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&h=150&auto=format&fit=crop&crop=face",
    name: "Aliza Khan",
    role: "Business Analyst",
  },
  {
    text: "Our business functions improved with a user-friendly design and positive customer feedback.",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=150&h=150&auto=format&fit=crop&crop=face",
    name: "Amar",
    role: "Marketing Director",
  },
  {
    text: "They delivered a solution that exceeded expectations, understanding our needs and enhancing our operations.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&h=150&auto=format&fit=crop&crop=face",
    name: "Sana Sheikh",
    role: "Sales Manager",
  },
  {
    text: "Smart reminders on WhatsApp mean I'm not the reminder anymore.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=150&h=150&auto=format&fit=crop&crop=face",
    name: "Hassan Ali",
    role: "E-commerce Manager",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export const Testimonials = () => {
  return (
    <section className="bg-[#F9F7E7] relative -mt-12 md:-mt-16 py-16">
      <div className="container z-10 mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border border-[#053725]/20 py-2 px-6 rounded-full bg-white/50 backdrop-blur-sm neumorphic">
              <span className="text-[#053725] font-bold text-lg">Testimonials</span>
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mt-8 text-[#053725] text-center">
            What our users say
          </h2>
          <p className="text-center mt-6 text-[#053725]/70 text-lg leading-relaxed">
            See what our customers have to say about us
          </p>
        </motion.div>
        <div className="flex justify-center gap-6 mt-16 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
};