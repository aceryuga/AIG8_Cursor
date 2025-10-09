// Trial Expired Block Component
// Shows when user's trial period has expired and blocks access

import React from 'react';
import { Crown, Calendar, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { SUBSCRIPTION_PLANS, TRIAL_CONFIG } from '../../config/subscriptionPlans';

interface TrialExpiredBlockProps {
  onUpgrade: () => void;
}

export const TrialExpiredBlock: React.FC<TrialExpiredBlockProps> = ({ onUpgrade }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const activePlans = SUBSCRIPTION_PLANS.filter(plan => plan.isActive);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Your Trial Period Has Expired
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Thank you for trying PropertyPro! Your {TRIAL_CONFIG.durationDays}-day trial has ended. 
            Choose a plan to continue managing your properties with our full suite of features.
          </p>
        </div>

        {/* Trial Info */}
        <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Trial Period Completed</h3>
              <p className="text-sm text-gray-600">
                You've used all {TRIAL_CONFIG.durationDays} days of your free trial
              </p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>What you experienced during your trial:</strong> Full access to all PropertyPro features 
              including property management, payment tracking, document storage, and AI-powered rent reconciliation.
            </p>
          </div>
        </div>

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
            Choose Your Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activePlans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all hover:shadow-md ${
                  plan.isPopular 
                    ? 'border-green-500 relative' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center mx-auto mb-4">
                    {plan.name === 'Portfolio' ? (
                      <Crown className="w-6 h-6 text-white" />
                    ) : plan.name === 'Professional' ? (
                      <CreditCard className="w-6 h-6 text-white" />
                    ) : (
                      <Calendar className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-gray-900">{formatCurrency(plan.price)}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Up to {plan.propertiesLimit} properties
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      </div>
                      {feature}
                    </li>
                  ))}
                  {plan.features.length > 5 && (
                    <li className="text-sm text-gray-500">
                      +{plan.features.length - 5} more features
                    </li>
                  )}
                </ul>

                <Button
                  onClick={onUpgrade}
                  className={`w-full flex items-center justify-center gap-2 ${
                    plan.isPopular 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-900 hover:bg-gray-800'
                  }`}
                >
                  Choose {plan.name}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            All Plans Include
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              'Multi-property dashboard',
              'AI rent matching',
              'Per-tenant UPI QR codes',
              'Payment recording & alerts',
              'Digital document vault',
              'Telegram/WhatsApp notifications',
              'Custom matching rules',
              'Data export',
              'Email support'
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                </div>
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support Info */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Need help choosing? Contact our support team at{' '}
            <a href="mailto:support@propertypro.com" className="text-green-600 hover:text-green-700">
              support@propertypro.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
