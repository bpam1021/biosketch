import axiosClient from './axiosClient';

// List all active challenges
export const getActiveChallenges = () =>
  axiosClient.get('/community/challenges/');

// Get detail of a specific challenge
export const getChallengeDetail = (challengeId: number) =>
  axiosClient.get(`/community/challenges/${challengeId}/`);

// Submit an entry to a challenge
export const submitChallengeEntry = (challengeId: number, data: FormData) =>
  axiosClient.post(`/community/challenges/${challengeId}/submit/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Get entries for a specific challenge
export const getChallengeEntries = (challengeId: number) =>
  axiosClient.get(`/community/challenges/${challengeId}/entries/`);

export const getChallengeEntryDetail = (challengeId: number, entryId: number) =>
  axiosClient.get(`/community/challenges/${challengeId}/entries/${entryId}/`);

// Upvote a challenge entry
export const voteChallengeEntry = (challengeId: number, entryId: number) =>
  axiosClient.post(`/community/challenges/${challengeId}/entries/${entryId}/vote/`);

// Remove upvote from a challenge entry
export const unvoteChallengeEntry = (challengeId: number, entryId: number) =>
  axiosClient.post(`/community/challenges/${challengeId}/entries/${entryId}/unvote/`);

// Comment on a challenge entry
export const commentOnChallengeEntry = (
  challengeId: number,
  entryId: number,
  text: string
) =>
  axiosClient.post(`/community/challenges/${challengeId}/entries/${entryId}/comment/`, {
    text,
  });

// Get leaderboard for a challenge
export const getChallengeLeaderboard = (challengeId: number) =>
  axiosClient.get(`/community/challenges/${challengeId}/leaderboard/`);
