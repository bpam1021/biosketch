import axiosClient from './axiosClient';

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

interface LoginPayload {
  username: string;
  password: string;
}

export const registerUser = (data: RegisterPayload) => 
  axiosClient.post('/users/auth/register/', data);

export const loginUser = (data: LoginPayload) => 
  axiosClient.post('/users/auth/login/', data);

export const checkUsername = (username: string) =>
  axiosClient.get(`/users/auth/check-username/?username=${encodeURIComponent(username)}`);

export const checkEmail = (email: string) =>
  axiosClient.get(`/users/auth/check-email/?email=${encodeURIComponent(email)}`);
