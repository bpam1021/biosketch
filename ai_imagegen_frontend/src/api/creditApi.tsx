import axiosClient from './axiosClient';

// 💰 Get current user's credit balance
export const getCreditBalance = () => axiosClient.get('/users/credits/remaining/');

// 📜 Get user's credit transaction history
export const getCreditHistory = () => axiosClient.get('/users/credits/transactions/');

// ⚙️ Test only: manually deduct credits (if needed)
export const deductCredits = (amount: number) =>
  axiosClient.post('/users/credits/deduct/', { amount });
