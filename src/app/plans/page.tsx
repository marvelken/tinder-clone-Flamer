"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Heart, 
  Check, 
  X, 
  Image, 
  Crown, 
  Users, 
  Zap,
  CreditCard,
  Loader
} from 'lucide-react';
import { createClient } from '../../../utils/supabase/client';
import { Permit } from "permitio";
import { syncUserToPermit } from '../../lib/permit';

export default function PlansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [user, setUser] = useState(null);
  
  // Initialize Supabase client
  const supabase = createClient();
  
  // Initialize Permit client
  const permit = new Permit({
    token: process.env.NEXT_PUBLIC_PERMIT_API_KEY,
    env: process.env.NEXT_PUBLIC_PERMIT_ENVIRONMENT || 'dev'
  });
  
  // Check for authenticated user
  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
      } else {
        // Redirect to login if not authenticated
        router.push('/auth');
      }
      
      setLoading(false);
    }
    
    getUser();
  }, [router]);
  
  // Plans data
  const plans = [
    {
      id: 'free_plan',
      name: 'Free',
      price: 0,
      features: [
        { text: 'Limited to 10 swipes per day', included: true },
        { text: 'View only first profile photo', included: true },
        { text: 'Cannot see who liked you', included: false },
        { text: 'Basic matching', included: true },
        { text: 'No priority in discovery queue', included: false },
      ],
      cta: 'Start Free',
      color: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-300',
      buttonClass: 'bg-gray-600 hover:bg-gray-700',
    },
    {
      id: 'premium_plan',
      name: 'Premium',
      price: 9.99,
      billingPeriod: 'month',
      features: [
        { text: 'Unlimited swipes', included: true },
        { text: 'View all profile photos', included: true },
        { text: 'See who liked you', included: true },
        { text: 'Priority in discovery queue', included: true },
        { text: 'Advanced filters', included: true },
      ],
      cta: 'Go Premium',
      color: 'bg-rose-100',
      textColor: 'text-rose-800',
      borderColor: 'border-rose-300',
      buttonClass: 'bg-rose-500 hover:bg-rose-600',
      badge: 'Most Popular',
    },
  ];
  
  // Handle plan selection
  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
    if (planId === 'premium_plan') {
      setShowPaymentModal(true);
    } else {
      // For free plan, assign the FreeUser role directly
      assignRole('FreeUser');
    }
  };
  
  // Assign role in Permit.io
  const assignRole = async (roleId) => {
    setProcessingPayment(true);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Call the syncUserToPermit function to assign the role in Permit.io
      const success = await syncUserToPermit(
        { id: user.id, email: user.email },
        roleId // 'FreeUser' or 'PremiumUser'
      );
      
      if (!success) {
        throw new Error('Failed to sync user role');
      }
      
      // For premium, also mark in the profile for our own tracking
      if (roleId === 'PremiumUser') {
        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(now.getMonth() + 1); // 1 month subscription
        
        await supabase
          .from('profiles')
          .update({ 
            premium_until: endDate.toISOString(),
            updated_at: now.toISOString()
          })
          .eq('id', user.id);
      }
      
      // Redirect to the swipe page (profile viewing)
      router.push('/swipe');
    } catch (error) {
      console.error('Error assigning role:', error);
      alert('There was an error processing your request. Please try again.');
    } finally {
      setProcessingPayment(false);
      setShowPaymentModal(false);
    }
  };
  
  // Simulate payment processing
  const handleProcessPayment = () => {
    // Simulate a payment process
    setProcessingPayment(true);
    
    // Add a slight delay to simulate payment processing
    setTimeout(() => {
      // After "successful" payment, assign PremiumUser role
      assignRole('PremiumUser');
    }, 1500);
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative py-12">
        {/* Header */}
        <div className="mx-auto mb-10 max-w-7xl px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Choose Your Plan</h1>
            <p className="mt-3 text-lg text-gray-500">
              Select the plan that works best for your dating journey
            </p>
          </div>
        </div>
        
        {/* Plans Grid */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-12 space-y-4 sm:grid sm:grid-cols-2 sm:gap-6 sm:space-y-0">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`flex flex-col rounded-lg border ${plan.borderColor} ${plan.color} shadow-md transition-all duration-200 hover:shadow-lg`}
              >
                {plan.badge && (
                  <div className="absolute right-4 top-0 z-10 translate-y-[-50%] rounded-full bg-rose-500 px-4 py-1 text-sm font-bold text-white shadow-md">
                    {plan.badge}
                  </div>
                )}
                
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline text-gray-900">
                    {plan.price > 0 ? (
                      <>
                        <span className="text-4xl font-extrabold tracking-tight">${plan.price}</span>
                        <span className="ml-1 text-xl font-semibold">/{plan.billingPeriod}</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">Free Forever</span>
                    )}
                  </div>
                  
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-900">What's included:</h4>
                    <ul className="mt-2 space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                          {feature.included ? (
                            <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                          ) : (
                            <X className="h-5 w-5 flex-shrink-0 text-gray-400" />
                          )}
                          <span className={`ml-2 text-sm ${feature.included ? 'text-gray-700' : 'text-gray-500'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="mt-auto p-6 pt-0">
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`w-full rounded-md ${plan.buttonClass} px-4 py-2 text-base font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2`}
                    disabled={processingPayment}
                  >
                    {processingPayment && selectedPlan === plan.id ? (
                      <span className="flex items-center justify-center">
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      plan.cta
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Feature Comparison */}
        <div className="mx-auto mt-16 max-w-3xl px-4">
          <h2 className="text-center text-2xl font-bold text-gray-900">Feature Comparison</h2>
          
          <div className="mt-8 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="grid grid-cols-3 border-b border-gray-200">
              <div className="p-4 font-medium text-gray-900">Feature</div>
              <div className="p-4 text-center font-medium text-gray-900">Free</div>
              <div className="p-4 text-center font-medium text-gray-900">Premium</div>
            </div>
            
            <div className="grid grid-cols-3 border-b border-gray-200">
              <div className="flex items-center p-4 text-sm text-gray-700">
                <Zap className="mr-2 h-5 w-5 text-gray-400" />
                Daily Swipes
              </div>
              <div className="p-4 text-center text-sm text-gray-700">10</div>
              <div className="p-4 text-center text-sm font-medium text-rose-600">Unlimited</div>
            </div>
            
            <div className="grid grid-cols-3 border-b border-gray-200">
              <div className="flex items-center p-4 text-sm text-gray-700">
                <Image className="mr-2 h-5 w-5 text-gray-400" />
                View Profile Photos
              </div>
              <div className="p-4 text-center text-sm text-gray-700">First photo only</div>
              <div className="p-4 text-center text-sm font-medium text-rose-600">All photos</div>
            </div>
            
            <div className="grid grid-cols-3 border-b border-gray-200">
              <div className="flex items-center p-4 text-sm text-gray-700">
                <Users className="mr-2 h-5 w-5 text-gray-400" />
                See Who Liked You
              </div>
              <div className="p-4 text-center text-sm text-gray-700">
                <X className="mx-auto h-5 w-5 text-gray-400" />
              </div>
              <div className="p-4 text-center text-sm text-rose-600">
                <Check className="mx-auto h-5 w-5 text-rose-500" />
              </div>
            </div>
            
            <div className="grid grid-cols-3">
              <div className="flex items-center p-4 text-sm text-gray-700">
                <Crown className="mr-2 h-5 w-5 text-gray-400" />
                Priority in Discovery
              </div>
              <div className="p-4 text-center text-sm text-gray-700">
                <X className="mx-auto h-5 w-5 text-gray-400" />
              </div>
              <div className="p-4 text-center text-sm text-rose-600">
                <Check className="mx-auto h-5 w-5 text-rose-500" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
              <h2 className="mb-4 text-2xl font-bold">Complete Your Purchase</h2>
              
              <div className="mb-4 rounded-md bg-rose-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Heart className="h-5 w-5 text-rose-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-rose-800">
                      This is a demo payment page. No real payment will be processed.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mb-6 border-b border-gray-200 pb-4">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Premium Plan</span>
                  <span className="font-medium text-gray-900">$9.99/month</span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Unlock all premium features for one month
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={processingPayment}
                  className="flex-1 rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 disabled:bg-rose-300"
                  onClick={handleProcessPayment}
                >
                  {processingPayment ? (
                    <span className="flex items-center justify-center">
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    "Complete Purchase"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}