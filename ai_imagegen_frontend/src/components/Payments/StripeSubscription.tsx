import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

import Sidebar from '../Sidebar';
import { useCredits } from '../../context/CreditsContext';
import { createPaymentIntent } from '../../api/paymentApi';
import { creditPackages } from '../../constants/creditPackages';
import { launchConfetti } from '../../utils/confetti';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const SubscriptionPage = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { fetchCredits } = useCredits();

  const [selectedKey, setSelectedKey] = useState('starter');
  const [loading, setLoading] = useState(false);
  const [error,] = useState<string | null>(null);

  const selectedPack = creditPackages.find((p) => p.key === selectedKey);

  const handlePayment = async () => {
    if (!stripe || !elements) {
      toast.error('Stripe not ready.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error('Missing card details.');
      return;
    }

    setLoading(true);
    try {
      const res = await createPaymentIntent(selectedKey);
      const { client_secret } = res.data;

      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: { card: cardElement },
      });

      if (result.error) throw new Error(result.error.message);

      toast.success(`Purchased ${selectedPack?.credits} credits successfully 🎉`);
      launchConfetti();
      fetchCredits();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Payment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 px-4 py-12 flex items-center justify-center">
        <div className="grid lg:grid-cols-2 gap-8 w-full max-w-6xl">

          {/* 🌟 Credit Pack Selection */}
          <div className="space-y-4">
            <div className="text-3xl font-bold mb-4">Choose a Credit Pack</div>
            {creditPackages.map((pack) => {
              const isSelected = selectedKey === pack.key;
              const isMostPopular = pack.key === 'pro';

              return (
                <motion.button
                  key={pack.key}
                  layout
                  initial={{ opacity: 0.8, scale: 1 }}
                  animate={{ opacity: 1, scale: isSelected ? 1.02 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  onClick={() => setSelectedKey(pack.key)}
                  className={`relative w-full flex justify-between items-center p-5 rounded-xl border transition-all duration-200
                    ${isSelected
                      ? 'border-blue-400 ring-2 ring-blue-500 bg-gray-800'
                      : 'border-gray-700 bg-gray-900 hover:ring-1 hover:ring-blue-400'}`}
                >
                  <div>
                    <div className="text-xl font-semibold">{pack.name}</div>
                    <div className="text-sm text-gray-400">{pack.credits} credits</div>
                    <div className="mt-1 text-sm font-mono text-yellow-400">
                      ${pack.price.toFixed(2)}
                      {pack.discount !== '—' && (
                        <span className="ml-2 text-green-400 font-medium">
                          ({pack.discount} off)
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <CheckCircle className="w-6 h-6 text-blue-400 shrink-0" />}
                  {isMostPopular && (
                    <span className="absolute top-0 right-0 bg-blue-600 text-xs text-white px-2 py-1 rounded-bl-lg rounded-tr-lg shadow font-semibold tracking-wide">
                      Most Popular
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* 💳 Payment Panel */}
          <div className="rounded-2xl p-6 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 shadow-xl backdrop-blur-md">
            <h3 className="text-2xl font-semibold mb-4">
              Checkout: <span className="text-blue-400">{selectedPack?.name}</span>
            </h3>

            <label className="block text-sm font-medium text-gray-300 mb-2">Payment Details</label>
            <div className="p-4 bg-gray-900 border border-gray-700 rounded-lg mb-6">
              <CardElement
                options={{
                  style: {
                    base: {
                      iconColor: '#c4f0ff',
                      color: '#ffffff',
                      fontSize: '16px',
                      '::placeholder': {
                        color: '#94a3b8',
                      },
                    },
                    invalid: {
                      color: '#ef4444',
                    },
                  },
                }}
              />
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white text-lg font-bold rounded-xl shadow hover:from-blue-500 hover:to-blue-700 disabled:opacity-50 transition"
            >
              {loading
                ? 'Processing...'
                : `Pay $${selectedPack?.price.toFixed(2)} and Get ${selectedPack?.credits} Credits`}
            </button>

            {error && (
              <p className="mt-4 text-center text-red-500 text-sm">{error}</p>
            )}
            <div className="mt-8 space-y-6 text-center text-base text-gray-200">

              {/* 🔹 Image Generation Info */}
              <div className="bg-gray-900 border border-blue-700 rounded-xl px-6 py-5 shadow-lg">
                <div className="text-lg font-bold text-white mb-3 flex items-center justify-center gap-2">
                  🖼️ Image Generation
                </div>
                <div className="space-y-2">
                  <p><span className="text-yellow-300 text-lg font-semibold">0.1</span> credit — Low Quality</p>
                  <p><span className="text-yellow-300 text-lg font-semibold">0.25</span> credits — Med Quality</p>
                  <p><span className="text-yellow-300 text-lg font-semibold">1</span> credit — High Quality</p>
                </div>
              </div>

              {/* 🔹 Slide Deck Info */}
              <div className="bg-gray-900 border border-purple-700 rounded-xl px-6 py-5 shadow-lg">
                <div className="text-lg font-bold text-white mb-3 flex items-center justify-center gap-2">
                  📽️ Presentation
                </div>
                <div className="space-y-2">
                  <p><span className="text-yellow-300 text-lg font-semibold">0.5</span> credits — Low Quality</p>
                  <p><span className="text-yellow-300 text-lg font-semibold">1.5</span> credits — Med Quality</p>
                  <p><span className="text-yellow-300 text-lg font-semibold">5</span> credits — High Quality</p>
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2 italic">
                You can choose quality before generating. Higher quality gives better results but uses more credits.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SubscriptionPageWithStripe = () => (
  <Elements stripe={stripePromise}>
    <SubscriptionPage />
  </Elements>
);

export default SubscriptionPageWithStripe;
