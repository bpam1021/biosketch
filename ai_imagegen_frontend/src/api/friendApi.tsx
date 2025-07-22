import axiosClient from './axiosClient';

// 🤝 Invite a friend by username or email
export const inviteFriend = (inviteeIdentifier: string) =>
  axiosClient.post('/users/friends/invite/', { invitee: inviteeIdentifier });

// 📜 Get list of people I’ve invited
export const getMyInvitations = () =>
  axiosClient.get('/users/friends/invited-users/');

// 🎁 Check pending rewards (e.g. when friend makes purchase)
export const getFriendRewards = () =>
  axiosClient.get('/users/friends/process-credit-rewards/');
