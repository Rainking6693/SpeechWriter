import { Handler } from '@netlify/functions'
import Stripe from 'stripe'

// Environment variables helper
const getEnvVar = (name: string, required = true): string => {
  const value = process.env[name]
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value || ''
}

// Initialize Stripe
const stripe = new Stripe(getEnvVar('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Webhook handler
export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Allow': 'POST',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const signature = event.headers['stripe-signature']
    const webhookSecret = getEnvVar('STRIPE_WEBHOOK_SECRET')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing signature' }),
      }
    }

    if (!event.body) {
      console.error('Missing event body')
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing body' }),
      }
    }

    // Verify webhook signature
    let stripeEvent: Stripe.Event
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        signature,
        webhookSecret
      )
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Invalid signature' }),
      }
    }

    console.log(`Processing webhook event: ${stripeEvent.type}`)

    // Handle the webhook event
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object as Stripe.Invoice)
        break

      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session)
        break

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ received: true }),
    }

  } catch (error) {
    console.error('Error processing webhook:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}

// Webhook event handlers
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Subscription created:', subscription.id)
  
  // TODO: Update user's subscription status in database
  // This would typically involve:
  // 1. Finding the user by customer ID
  // 2. Creating/updating subscription record
  // 3. Updating user's plan status
  
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id
  
  console.log(`Customer ${customerId} subscribed to ${priceId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Subscription updated:', subscription.id)
  
  // TODO: Update subscription details in database
  const customerId = subscription.customer as string
  const status = subscription.status
  const priceId = subscription.items.data[0]?.price.id
  
  console.log(`Customer ${customerId} subscription status: ${status}, plan: ${priceId}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Subscription deleted:', subscription.id)
  
  // TODO: Update user's subscription status to cancelled
  const customerId = subscription.customer as string
  
  console.log(`Customer ${customerId} subscription cancelled`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Payment succeeded for invoice:', invoice.id)
  
  // TODO: Update payment records
  // This could involve:
  // 1. Recording successful payment
  // 2. Updating subscription status if needed
  // 3. Sending confirmation email
  
  const customerId = invoice.customer as string
  const amountPaid = invoice.amount_paid / 100 // Convert from cents
  
  console.log(`Customer ${customerId} paid $${amountPaid}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Payment failed for invoice:', invoice.id)
  
  // TODO: Handle failed payment
  // This could involve:
  // 1. Recording failed payment attempt
  // 2. Notifying user
  // 3. Implementing retry logic or downgrade
  
  const customerId = invoice.customer as string
  const attemptCount = invoice.attempt_count
  
  console.log(`Payment failed for customer ${customerId}, attempt ${attemptCount}`)
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Checkout session completed:', session.id)
  
  // TODO: Handle successful checkout
  // This typically happens before subscription.created
  // Could be used for:
  // 1. Initial user onboarding
  // 2. Sending welcome emails
  // 3. Activating trial periods
  
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string
  
  console.log(`Customer ${customerId} completed checkout, subscription: ${subscriptionId}`)
}