import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch payment status from the backend
    const fetchPaymentStatus = async () => {
      try {
        const response = await fetch('/api/confirm-payment', { method: 'POST' });
        const data = await response.json();
        if (data.success) {
          // Update UI or navigate to a dashboard
        } else {
          navigate('/payment-failure');
        }
      } catch (error) {
        navigate('/payment-failure');
      }
    };

    fetchPaymentStatus();
  }, [navigate]);

  return <h1>Payment Successful! Thank you for your purchase.</h1>;
};

export default PaymentSuccess;
