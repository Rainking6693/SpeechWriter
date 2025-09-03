import Stripe from 'stripe'
import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js'
import { env } from '../../../../lib/env'

// Server-side Stripe instance
export const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Client-side Stripe instance (singleton)
let stripePromise: Promise<StripeJS | null>
export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(env.STRIPE_PUBLIC_KEY!)
  }
  return stripePromise
}

// Pricing configuration
export const PRICING_PLANS = {
  FREE: {
    name: 'Free',
    priceId: env.STRIPE_PRICE_ID_FREE,
    price: 0,
    features: [
      'Up to 3 speeches per month',
      'Basic AI writing assistance',
      'Standard templates',
      'Export to PDF/DOCX',
      'Community support',
    ],
    limitations: {
      speechesPerMonth: 3,
      maxSpeechLength: 1000, // words
      customBranding: false,
      prioritySupport: false,
    },
  },
  PRO: {
    name: 'Pro',
    priceId: env.STRIPE_PRICE_ID_PRO,
    price: 29, // $29/month
    features: [
      'Unlimited speeches',
      'Advanced AI humanization',
      'Custom personas & styles',
      'Teleprompter & rehearsal tools',
      'Priority support',
      'Advanced analytics',
    ],
    limitations: {
      speechesPerMonth: -1, // unlimited
      maxSpeechLength: -1, // unlimited
      customBranding: true,
      prioritySupport: true,
    },
  },
  TEAM: {
    name: 'Team',
    priceId: env.STRIPE_PRICE_ID_TEAM,
    price: 99, // $99/month
    features: [
      'Everything in Pro',
      'Team collaboration',
      'Shared templates & personas',
      'Advanced permissions',
      'SSO integration',
      'Custom integrations',
      'Dedicated account manager',
    ],
    limitations: {
      speechesPerMonth: -1, // unlimited
      maxSpeechLength: -1, // unlimited
      customBranding: true,
      prioritySupport: true,
      teamCollaboration: true,
      ssoIntegration: true,
    },
  },
} as const

export type PricingPlan = keyof typeof PRICING_PLANS
export type PlanConfig = typeof PRICING_PLANS[PricingPlan]

// Helper functions
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(price)
}

export const getPlanByPriceId = (priceId: string): PricingPlan | null => {
  for (const [planName, config] of Object.entries(PRICING_PLANS)) {
    if (config.priceId === priceId) {
      return planName as PricingPlan
    }
  }
  return null
}

// Webhook helpers
export const constructWebhookEvent = (body: Buffer, signature: string) => {
  return stripe.webhooks.constructEvent(
    body,
    signature,
    env.STRIPE_WEBHOOK_SECRET!
  )
}

// Customer management
export const createOrRetrieveCustomer = async (email: string, userId: string) => {
  // Try to find existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  })
  
  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0]
  }
  
  // Create new customer
  return await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })
}

// Checkout session creation
export const createCheckoutSession = async (
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) => {
  return await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        customerId,
      },
    },
  })
}

// Portal session creation
export const createPortalSession = async (
  customerId: string,
  returnUrl: string
) => {
  return await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}