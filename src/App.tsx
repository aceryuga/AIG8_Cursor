import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/ui/header';
import { NavBar } from './components/ui/tubelight-navbar';
import { Hero } from './components/ui/animated-hero';
import { BounceCards } from './components/ui/bounce-cards';
import { GlowingFeatures } from './components/ui/glowing-features';
import { LandingAccordionItem } from './components/ui/interactive-image-accordion';
import { Testimonials } from './components/ui/testimonials';
import { Pricing } from './components/ui/pricing';
import { FaqSectionWithCategories } from './components/ui/faq-with-categories';
import { Footerdemo } from './components/ui/footer-section';
import { Home, Zap, DollarSign, MessageCircle, Building, Users, Star, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Import Real Auth Pages
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { NewPasswordPage } from './components/auth/NewPasswordPage';
import { VerificationPage } from './components/auth/VerificationPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { PropertiesList } from './components/properties/PropertiesList';
import { PropertyDetails } from './components/properties/PropertyDetails';
import { AddProperty } from './components/properties/AddProperty';
import { PaymentHistory } from './components/payments/PaymentHistory';
import { RecordPayment } from './components/payments/RecordPayment'; 
import { AIReconciliation } from './components/payments/AIReconciliation';
import { DocumentVault } from './components/documents/DocumentVault';
import { DocumentUpload } from './components/documents/DocumentUpload';
import { DocumentViewer } from './components/documents/DocumentViewer';
import { Gallery } from './pages/Gallery';
import { SettingsPage } from './components/settings/SettingsPage';


// Landing Page Component
const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navItems = [
    { name: 'About Us', url: '#', icon: Home, onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { name: 'Features', url: '#features', icon: Zap, onClick: () => scrollToSection('features') },
    { name: 'Pricing', url: '#pricing', icon: DollarSign, onClick: () => scrollToSection('pricing') },
    { name: 'Contact', url: '#contact', icon: MessageCircle, onClick: () => scrollToSection('contact') },
    // Add Dashboard only when logged in
    ...(user ? [{ name: 'Dashboard', url: '/dashboard', icon: Building, onClick: () => navigate('/dashboard') }] : [])
  ];

  return (
    <div className="min-h-screen bg-[#F9F7E7]">
      <Header />
      
      <main className="pt-20 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          <Hero />

          <div className="pt-2 pb-2 mt-2 flex justify-center items-center">
            <BounceCards
              images={[
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=500&auto=format",
                "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?q=80&w=500&auto=format",
                "https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=500&auto=format",
                "https://images.unsplash.com/photo-1452626212852-811d58933cae?q=80&w=500&auto=format",
                "https://images.unsplash.com/photo-1572120360610-d971b9d7767c?q=80&w=500&auto=format"
              ]}
              containerWidth={500}
              containerHeight={300}
              animationDelay={1.2}
              animationStagger={0.08}
              easeType="elastic.out(1, 0.5)"
              transformStyles={[
                "rotate(5deg) translate(-150px)",
                "rotate(0deg) translate(-70px)",
                "rotate(-5deg)",
                "rotate(5deg) translate(70px)",
                "rotate(-5deg) translate(150px)"
              ]}
              className="mx-auto flex justify-center -mt-4 md:-mt-12"
            />
          </div>

          <section id="features" className="scroll-mt-24">
            <GlowingFeatures />
          </section>

          <LandingAccordionItem />

          <div className="-mt-12 pt-12 pb-16 border-t border-[#053725]/10">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-[#053725] mb-4">Trusted by Independent Property Owners</h2>
              <p className="text-lg text-[#053725]/70 max-w-2xl mx-auto">
                Built for owners who manage their properties themselves. Secure, private, and dependable
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
              {[
                { icon: Users, value: '10,000+', label: 'Active Users' },
                { icon: Building, value: '50,000+', label: 'Properties Managed' },
                { icon: Clock, value: '99.9%', label: 'Uptime' },
                { icon: TrendingUp, value: '40%', label: 'Time Saved' }
              ].map((stat, index) => (
                <div key={index} className="text-center p-8 rounded-2xl bg-white/50 backdrop-blur-sm border border-[#053725]/5 hover:border-[#053725]/10 transition-all duration-300 group hover:shadow-[0_8px_32px_rgba(5,55,37,0.1)]">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#053725] to-[#053725]/90 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-[0_4px_20px_rgba(5,55,37,0.2)]">
                    <stat.icon size={28} className="text-[#F9F7E7]" strokeWidth={2} />
                  </div>
                  <div className="text-3xl font-bold text-[#053725] mb-2">{stat.value}</div>
                  <div className="text-sm font-medium text-[#053725]/70">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-center max-w-4xl mx-auto">
              <div className="flex flex-col items-center p-6 rounded-xl bg-white/30 backdrop-blur-sm border border-[#053725]/5">
                <div className="flex mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={18} className="text-[#ec632f] fill-current" />
                  ))}
                </div>
                <span className="text-sm text-[#053725] font-semibold">4.9/5 Rating</span>
              </div>
            </div>
          </div>

          <Testimonials />

          <div id="pricing" className="-mt-8 md:-mt-12">
            <Pricing
            title="Simple pricing that scales with your portfolio"
            description={<>Full features on every plan. Choose capacity based on the number of active properties. <strong>14-day free trial</strong>. No setup fees. Prices exclude GST</>}
            plans={[
              {
                name: "Starter",
                price: "799",
                yearlyPrice: "7668",
                features: [
                  "Capacity 1-3 properties",
                  "Multi‑property dashboard",
                  "AI rent matching",
                  "Per‑tenant UPI QR",
                  "Payment recording & overdue alerts",
                  "Digital document vault with renewals",
                  "Telegram/WhatsApp notifications",
                  "Custom matching rules",
                  "Data export",
                  "Email support"
                ],
                buttonText: "Start Free Trial",
                href: "#/auth/signup",
                isPopular: false,
              },
              {
                name: "Professional",
                price: "1499",
                yearlyPrice: "14390",
                features: [
                  "Capacity 4–8 properties",
                  "Multi‑property dashboard",
                  "AI rent matching",
                  "Per‑tenant UPI QR",
                  "Payment recording & overdue alerts",
                  "Digital document vault with renewals",
                  "Telegram/WhatsApp notifications",
                  "Custom matching rules",
                  "Data export",
                  "Email support"
                ],
                buttonText: "Start Free Trial",
                href: "#/auth/signup",
                isPopular: true,
              },
              {
                name: "Portfolio",
                price: "2499",
                yearlyPrice: "23990",
                features: [
                  "Capacity 9–15 properties",
                  "Multi‑property dashboard",
                  "AI rent matching",
                  "Per‑tenant UPI QR",
                  "Payment recording & overdue alerts",
                  "Digital document vault with renewals",
                  "Telegram/WhatsApp notifications",
                  "Custom matching rules",
                  "Data export",
                  "Priority support"
                  ],
                buttonText: "Start Free Trial",
                href: "#/auth/signup",
                isPopular: false,
              },
            ]}
            />
          </div>

          <div className="-mt-12 md:-mt-16">
          <FaqSectionWithCategories
            title="Frequently Asked Questions"
            description="Get answers to common questions about PropertyPro and our property management solutions"
            items={[
              {
                question: "How does PropertyPro help with rent reconciliation?",
                answer: "PropertyPro uses AI to automatically match bank statements with rent payments, reducing manual work from hours to minutes. Our system recognizes payment patterns and suggests matches, with manual override options for complex cases.",
                category: "Features",
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards, UPI payments, bank transfers, and digital wallets. All payments are processed securely through our encrypted payment gateway with bank-level security.",
                category: "Billing",
              },
              {
                question: "Is there a free trial available?",
                answer: "Yes! We offer a 14-day free trial with full access to all features. No credit card required to start your trial. You can manage up to 10 properties during the trial period.",
                category: "Getting Started",
              },
              {
                question: "How does the automated tenant reminder system work?",
                answer: "Our system automatically sends Telegram/WhatsApp and email reminders to tenants for due rent, lease renewals, and other important notifications. You can customize reminder schedules and templates to match your communication style.",
                category: "Features",
              },
              {
                question: "Can I import my existing property data?",
                answer: "Absolutely! PropertyPro supports data import from Excel, CSV files, and other property management systems. Our team provides free migration assistance to ensure a smooth transition.",
                category: "Getting Started",
              },
              {
                question: "What kind of reports can I generate?",
                answer: "PropertyPro offers comprehensive reporting including cash flow analysis, occupancy rates, maintenance costs, tenant payment history, and ROI calculations. All reports can be exported to PDF or Excel.",
                category: "Features",
              },
              {
                question: "Is my data secure and backed up?",
                answer: "Yes, we use bank-level encryption and store all data on secure cloud servers with automatic daily backups. We're SOC 2 compliant and follow strict data protection protocols.",
                category: "Security",
              },
              {
                question: "How can I contact support?",
                answer: "Our support team is available Monday-Friday 9 AM to 6 PM IST through live chat, email, and phone. Professional and Portfolio customers get priority support with faster response times.",
                category: "Support",
              },
            ]}
            contactInfo={{
              title: "Still have questions?",
              description: "Our team is here to help you get the most out of PropertyPro",
              buttonText: "Contact Support",
              onContact: () => console.log("Contact support clicked"),
            }}
          />
          </div>
        </div>
      </main>

      <div id="contact" className="-mt-8 md:-mt-12">
        <Footerdemo />
      </div>

      <NavBar 
        items={navItems.map(item => ({
          ...item,
          onClick: item.onClick
        }))} 
      />
    </div>
  );
};

// Placeholder Pages (for routes not yet built)
//const Properties = () => <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><h1 className="text-4xl font-bold mb-4">Properties</h1><p className="text-gray-600">Coming soon</p></div></div>;
//const Payments = () => <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><h1 className="text-4xl font-bold mb-4">Payments</h1><p className="text-gray-600">Coming soon</p></div></div>;
//const Documents = () => <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><h1 className="text-4xl font-bold mb-4">Documents</h1><p className="text-gray-600">Coming soon</p></div></div>;
//const Settings = () => <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center"><h1 className="text-4xl font-bold mb-4">Settings</h1><p className="text-gray-600">Coming soon</p></div></div>;

// Main App with Routing
function App() {
  const { user } = useAuth();
  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Auth Routes - REAL PAGES! */}
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/reset" element={<ResetPasswordPage />} />
        <Route path="/auth/new-password" element={<NewPasswordPage />} />
        <Route path="/auth/verify" element={<VerificationPage />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Properties Routes */}
        <Route path="/properties" element={<PropertiesList />} />
        <Route path="/properties/:id" element={<PropertyDetails />} />
        <Route path="/properties/add" element={<AddProperty />} />

        {/* Payments Routes */}
        <Route path="/payments" element={<PaymentHistory />} />
        <Route path="/payments/record" element={<RecordPayment />} />
        <Route path="/payments/reconciliation" element={<AIReconciliation />} />
        
        {/* Documents Routes */}
        <Route path="/documents" element={<DocumentVault />} />
        <Route path="/documents/upload" element={<DocumentUpload />} />
        <Route path="/documents/:id" element={<DocumentViewer />} />

        {/* Gallery Route */}
        <Route path="/gallery" element={<Gallery />} />

        {/* Settings Route */}
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
