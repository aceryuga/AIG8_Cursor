import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MoveRight, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedCanvas } from "@/components/ui/animated-canvas";
import { TextScramble } from "@/components/ui/text-scramble";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["simple", "smart", "seamless", "efficient", "ai-powered"],
    []
  );
  const longestTitle = useMemo(
    () => titles.reduce((a, b) => (a.length > b.length ? a : b)),
    [titles]
  );
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full relative">
      {/* Animated Canvas Background */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatedCanvas 
          count={30} 
          lineColor="rgba(5, 55, 37, 0.1)"
          heightMultiplier={0.3}
          speed={0.00001}
          lineWidth={1}
          className="absolute inset-0 w-full h-full"
          direction="right-to-left"
        />
        <AnimatedCanvas 
          count={25} 
          lineColor="rgba(236, 99, 47, 0.08)"
          heightMultiplier={0.25}
          speed={0.000015}
          lineWidth={1.5}
          className="absolute inset-0 w-full h-full"
          direction="left-to-right"
        />
      </div>
      
      {/* Hero Content */}
      <div className="container mx-auto">
        <div className="relative z-10 flex gap-8 py-12 lg:py-32 items-center justify-center flex-col">
          <div>
            <div className="flex justify-center -mt-4 md:-mt-6">
              <Button variant="secondary" size="sm" className="relative -top-4 md:-top-6 gap-4 neumorphic hover:shadow-[0_6px_20px_rgba(5,55,37,0.2)] transition-all duration-300">
                Read our launch article <MoveRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 flex-col">
              <h1 className="text-5xl md:text-7xl tracking-tighter text-center font-regular max-w-none">
                <span className="text-[#053725] whitespace-nowrap">
                  Independent Property Management
                </span>
              <br/>
                <span className="text-[#053725] text-5xl md:text-7xl italic block w-full text-center" style={{ fontFamily: 'Orpheus Pro, Aptos' }}>
                  made<span className="inline-block w-[0.6ch]" aria-hidden="true" />
                  <span className="relative inline-block align-baseline text-left">
                    <span className="invisible" aria-hidden="true">{longestTitle}</span>
                  {titles.map((title, index) => (
                    <motion.span
                      key={index}
                      className="absolute inset-0 text-[#ec632f] text-left italic"
                      style={{ fontFamily: 'Orpheus Pro, Aptos' }}
                      initial={{ opacity: 0, y: "-100" }}
                      transition={{ type: "spring", stiffness: 50 }}
                      animate={
                        titleNumber === index
                          ? {
                              y: 0,
                              opacity: 1,
                            }
                          : {
                              y: titleNumber > index ? -150 : 150,
                              opacity: 0,
                            }
                      }
                    >
                      {title}
                    </motion.span>
                  ))}
                </span>
              </span>   
              </h1>
              <p className="text-lg md:text-xl leading-relaxed tracking-tight text-[#053725]/70 max-w-2xl text-center mx-auto">
                Gain complete control over your rental income, automate rent reconciliation, lease renewals & tenant reminders in one
              </p>
              <div className="flex justify-center mt-2">
                <TextScramble 
                  className="text-lg uppercase text-[#053725] font-semibold tracking-wider"
                  style={{ fontFamily: 'Aptos, system-ui, sans-serif' }}
                  duration={1.2}
                  speed={0.03}
                >
                  AI-Powered Dashboard
                </TextScramble>
              </div>
            </div>
            <div className="flex flex-row gap-3 justify-center mt-8">
              <Button size="lg" className="gap-4 neumorphic hover:shadow-[0_8px_32px_rgba(5,55,37,0.2)] transition-all duration-300" variant="outline" asChild>
                <a href="#/auth/signup">
                  Start Free Trial<MoveRight className="w-4 h-4" />
                </a>
              </Button>
              <Button size="lg" className="gap-4 neumorphic hover:shadow-[0_8px_32px_rgba(5,55,37,0.4)] transition-all duration-300">
                Jump on a Call<PhoneCall className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };