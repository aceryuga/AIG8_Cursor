"use client"
import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { DivideIcon as LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
  onClick?: () => void
}

interface NavBarProps {
  items: NavItem[]
  className?: string
}

export function NavBar({ items, className }: NavBarProps) {
  const [activeTab, setActiveTab] = useState(items[0].name)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <div
      className={cn(
        "fixed bottom-4 sm:bottom-auto sm:top-6 left-1/2 -translate-x-1/2 z-50",
        className,
      )}
    >
      <div className="flex items-center gap-1 bg-[#F9F7E7]/90 border border-[#053725]/20 backdrop-blur-lg py-2 px-3 rounded-full shadow-[0_8px_32px_0_rgba(5,55,37,0.37)] neumorphic">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.name
          return (
            <button
              key={item.name}
              onClick={() => {
                setActiveTab(item.name)
                if (item.onClick) {
                  item.onClick()
                }
              }}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-6 py-3 rounded-full transition-all duration-300",
                "text-[#053725]/70 hover:text-[#053725]",
                isActive && "text-[#053725] shadow-[inset_0_2px_4px_0_rgba(5,55,37,0.2)]",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 w-full bg-gradient-to-t from-[#053725]/10 to-[#053725]/5 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#053725] rounded-t-full shadow-[0_0_20px_rgba(5,55,37,0.6)]">
                    <div className="absolute w-12 h-6 bg-[#053725]/30 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-[#053725]/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-[#053725]/15 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}