"use client"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Facebook, Instagram, Linkedin, Send, Twitter } from "lucide-react"

function Footerdemo() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative border-t border-[#053725]/10 bg-[#F9F7E7] text-[#053725] transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-[#053725]">Stay Connected</h2>
            <p className="mb-6 text-[#053725]/70">
              Join us for the latest updates and exclusive offers.
            </p>
            <form className="relative">
              <Input
                type="email"
                placeholder="Enter your email"
                className="pr-12 backdrop-blur-sm border-[#053725]/20 bg-white/50 text-[#053725] placeholder:text-[#053725]/50"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-gradient-to-r from-[#053725] to-[#053725]/90 text-[#F9F7E7] transition-transform hover:scale-105 neumorphic"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
            <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-[#053725]/10 blur-2xl" />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-[#053725]">Quick Links</h3>
            <nav className="space-y-2 text-sm">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="block transition-colors hover:text-[#ec632f] text-[#053725]/80 text-left">
                Home
              </button>
              <button onClick={() => scrollToSection('features')} className="block transition-colors hover:text-[#ec632f] text-[#053725]/80 text-left">
                Features
              </button>
              <button onClick={() => scrollToSection('pricing')} className="block transition-colors hover:text-[#ec632f] text-[#053725]/80 text-left">
                Pricing
              </button>
              <button href="#" className="block transition-colors hover:text-[#ec632f] text-[#053725]/80">
                About Us
              </button>
              <button onClick={() => scrollToSection('contact')} className="block transition-colors hover:text-[#ec632f] text-[#053725]/80 text-left">
                Contact
              </button>
            </nav>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold text-[#053725]">Contact Us</h3>
            <address className="space-y-2 text-sm not-italic text-[#053725]/70">
              <p>123 Innovation Street</p>
              <p>Bangalore, KA 560001</p>
              <p>Phone: +91 98765 43210</p>
              <p>Email: hello@propertypro.com</p>
            </address>
          </div>

          <div className="relative">
            <h3 className="mb-4 text-lg font-semibold text-[#053725]">Follow Us</h3>
            <div className="mb-6 flex space-x-4">
              <Button variant="outline" size="icon" className="rounded-full border-[#053725]/20 bg-white/50 text-[#053725] hover:bg-[#053725] hover:text-[#F9F7E7] neumorphic">
                <Facebook className="h-4 w-4" />
                <span className="sr-only">Facebook</span>
              </Button>

              <Button variant="outline" size="icon" className="rounded-full border-[#053725]/20 bg-white/50 text-[#053725] hover:bg-[#053725] hover:text-[#F9F7E7] neumorphic">
                <Twitter className="h-4 w-4" />
                <span className="sr-only">Twitter</span>
              </Button>

              <Button variant="outline" size="icon" className="rounded-full border-[#053725]/20 bg-white/50 text-[#053725] hover:bg-[#053725] hover:text-[#F9F7E7] neumorphic">
                <Instagram className="h-4 w-4" />
                <span className="sr-only">Instagram</span>
              </Button>

              <Button variant="outline" size="icon" className="rounded-full border-[#053725]/20 bg-white/50 text-[#053725] hover:bg-[#053725] hover:text-[#F9F7E7] neumorphic">
                <Linkedin className="h-4 w-4" />
                <span className="sr-only">LinkedIn</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#053725]/10 pt-8 text-center md:flex-row">
          <p className="text-sm text-[#053725]/70">
            © 2024 PropertyPro. All rights reserved.
          </p>
          <nav className="flex gap-4 text-sm">
            <a href="#" className="transition-colors hover:text-[#ec632f] text-[#053725]/70">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-[#ec632f] text-[#053725]/70">
              Terms of Service
            </a>
            <a href="#" className="transition-colors hover:text-[#ec632f] text-[#053725]/70">
              Cookie Settings
            </a>
          </nav>
        </div>
      </div>
    </footer>
  )
}

export { Footerdemo }