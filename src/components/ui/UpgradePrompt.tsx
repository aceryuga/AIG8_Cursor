// Upgrade Prompt Component
// Shows when users hit usage limits and need to upgrade

import React, { useState } from 'react';
import { X, Crown, Zap, User, Check, ArrowRight } from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { SUBSCRIPTION_PLANS, UPGRADE_FLOW } from '../../config/subscriptionPlans';
import { approveUpgrade } from '../../utils/usageLimits';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  suggestedPlan?: string;
  reason: string;
  userId: string;
  onUpgradeSuccess?: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  currentPlan,
  suggestedPlan,
  reason,
  userId,
  onUpgradeSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(suggestedPlan || null);

  if (!isOpen) return null;

  const currentPlanData = SUBSCRIPTION_PLANS.find(plan => plan.name === currentPlan);
  const upgradeOptions = currentPlanData 
    ? SUBSCRIPTION_PLANS.filter(plan => plan.price > currentPlanData.price && plan.isActive)
    : SUBSCRIPTION_PLANS.filter(plan => plan.isActive);

  const handleUpgrade = async () => {
    if (!selectedPlan) return;
    
    setLoading(true);
    try {
      const result = await approveUpgrade(userId, selectedPlan);
      
      if (result.success) {
        alert(result.message);
        onUpgradeSuccess?.();
        onClose();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('An error occurred during upgrade. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-800 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upgrade Required</h2>
              <p className="text-sm text-gray-600">Choose a plan that fits your needs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Reason */}
        <div className="p-6 border-b bg-yellow-50">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Limit Reached</h3>
              <p className="text-sm text-yellow-700 mt-1">{reason}</p>
            </div>
          </div>
        </div>

        {/* Current Plan */}
        {currentPlanData && (
          <div className="p-6 border-b">
            <h3 className="font-medium text-gray-900 mb-3">Current Plan</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{currentPlanData.name}</h4>
                    <p className="text-sm text-gray-600">
                      {currentPlanData.propertiesLimit} properties • {currentPlanData.storageLimitMB}MB storage
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(currentPlanData.price)}/month</p>
                  <p className="text-sm text-gray-600">Current plan</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade Options */}
        <div className="p-6">
          <h3 className="font-medium text-gray-900 mb-4">Available Upgrades</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upgradeOptions.map((plan) => (
              <div
                key={plan.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedPlan === plan.name
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedPlan(plan.name)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {plan.name === 'Portfolio' ? (
                      <Crown className="w-5 h-5 text-green-600" />
                    ) : plan.name === 'Professional' ? (
                      <Zap className="w-5 h-5 text-green-600" />
                    ) : (
                      <User className="w-5 h-5 text-green-600" />
                    )}
                    <h4 className="font-medium text-gray-900">{plan.name}</h4>
                  </div>
                  {plan.isPopular && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
                
                <div className="mb-3">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(plan.price)}</p>
                  <p className="text-sm text-gray-600">per month</p>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600" />
                    {plan.propertiesLimit} properties
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-600" />
                    {plan.storageLimitMB === -1 ? 'Unlimited' : `${plan.storageLimitMB}MB`} storage
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="truncate">• {feature}</div>
                  ))}
                  {plan.features.length > 3 && (
                    <div>• +{plan.features.length - 3} more features</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Maybe Later
          </button>
          <Button
            onClick={handleUpgrade}
            disabled={!selectedPlan || loading}
            loading={loading}
            className="flex items-center gap-2"
          >
            {UPGRADE_FLOW.upgradeButtonText}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
