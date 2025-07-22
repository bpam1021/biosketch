import axiosClient from './axiosClient';

export const createPaymentIntent = (packageKey: string) =>
  axiosClient.post('/users/payments/create-intent/', { package_key: packageKey });

export const confirmPayment = (payment_intent_id: string) =>
  axiosClient.post('users/payment/confirm/', { payment_intent_id });

export const triggerStripeWebhook = (payload: any) =>
  axiosClient.post('users/payment/webhook/', payload);

export const getRemainingCredits = () =>
  axiosClient.get('users/credits/balance/');

