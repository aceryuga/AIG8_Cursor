import React, { useState } from 'react';

// --- Data for the image accordion ---
const accordionItems = [
  {
    id: 1,
    title: 'Portfolio Management',
    imageUrl: 'https://unsplash.com/photos/a-group-of-tall-buildings-with-a-sky-background-9xqx4ZKpj4U',
  },
  {
    id: 2,
    title: 'Tenant Tracking',
    imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=400&auto=format',
  },
  {
    id: 3,
    title: 'Finance',
    imageUrl: 'https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=400&auto=format',
  },
  {
    id: 4,
    title: 'Document Hub',
    imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=400&auto=format',
  },
  {
    id: 5,
    title: 'Smart Insights',
    imageUrl: 'https://unsplash.com/photos/a-group-of-tall-buildings-with-a-sky-background-9xqx4ZKpj4U',
  },
];

// --- Accordion Item Component ---
const AccordionItem = ({ item, isActive, onMouseEnter }: {
  item: typeof accordionItems[0];
  isActive: boolean;
  onMouseEnter: () => void;
}) => {
  return (
    <div
      className={`
        relative h-[450px] rounded-2xl overflow-hidden cursor-pointer
        transition-all duration-700 ease-in-out
        ${isActive ? 'w-[400px]' : 'w-[60px]'}
      `}
      onMouseEnter={onMouseEnter}
    >
      {/* Background Image */}
      <img
        src={item.imageUrl}
        alt={item.title}
        className="absolute inset-0 w-full h-full object-cover"
        onError={(e) => { 
          const target = e.target as HTMLImageElement;
          target.onerror = null; 
          target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=400&auto=format'; 
        }}
      />
      
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      
      {/* Caption Text */}
      <span
        className={`
          absolute text-white text-lg font-semibold whitespace-nowrap
          transition-all duration-300 ease-in-out
          ${
            isActive
              ? 'bottom-6 left-1/2 -translate-x-1/2 rotate-0' // Active state: horizontal, bottom-center
              // Inactive state: vertical, positioned at the bottom, for all screen sizes
              : 'w-auto text-left bottom-24 left-1/2 -translate-x-1/2 rotate-90'
          }
        `}
      >
        {item.title}
      </span>
    </div>
  );
};

// --- Main App Component ---
export function LandingAccordionItem() {
  const [activeIndex, setActiveIndex] = useState(4);

  const handleItemHover = (index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="bg-[#F9F7E7] font-sans">
      <section className="container mx-auto px-4 py-12 md:py-24 -mt-16 md:-mt-20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12">
          {/* Left Side: Text Content */}
          <div className="w-full md:w-1/2 text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-bold text-[#053725] leading-tight tracking-tighter">
              Simplify Property Management with AI
            </h1>
            <p className="mt-6 text-lg text-[#053725]/70 max-w-xl mx-auto md:mx-0">
              Automate rent collection, organize documents, and get AI insights without technical complexity
            </p>
            <div className="mt-8">
              <a
                href="#/auth/signup"
                className="inline-block bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-[0_8px_32px_rgba(5,55,37,0.4)] transition-all duration-300 neumorphic"
              >
                Start Free Trial
              </a>
            </div>
          </div>

          {/* Right Side: Image Accordion */}
          <div className="w-full md:w-1/2">
            <div className="flex flex-row items-center justify-center gap-4 overflow-x-auto p-4">
              {accordionItems.map((item, index) => (
                <AccordionItem
                  key={item.id}
                  item={item}
                  isActive={index === activeIndex}
                  onMouseEnter={() => handleItemHover(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}