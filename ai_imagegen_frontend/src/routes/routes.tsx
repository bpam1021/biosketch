import { Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';
import NotFound from '../pages/NotFound';
import PrivateRoute from './PrivateRoute';

import ImageGenerator from '../pages/ImageGenerator';
import ImageEditingTool from '../pages/ImageEditingTool';

import CommunityPage from '../pages/Community/CommunityPage';
import CommunityDetailPage from '../pages/Community/CommunityDetailPage';
import CommunityCreatePage from '../pages/Community/CommunityCreatePage';
import MyCommunitiesPage from '../pages/Community/MyCommunityPage';
import ImageDetailPage from '../pages/Community/ImageDetailPage';
import RemixPage from '../pages/Community/RemixPage';

import UserProfilePage from '../pages/Profile/UserProfilePage';
import EditUserProfilePage from '../pages/Profile/EditUserProfilePage';

import ChallengePage from '../pages/Challenges/ChallengePage';
import ChallengeDetailPage from '../pages/Challenges/ChallengeDetailPage';

import StripeSubscription from '../components/Payments/StripeSubscription';

import LeaderboardPage from '../pages/LeaderboardPage';

import CreatePresentationPage from '../pages/Presentation/CreatePresentationPage';
import PresentationPage from '../pages/Presentation/PresentationPage';
import PresentationsListPage from '../pages/Presentation/PresentationsListPage';

import RNASeqDashboard from '../pages/RNASeq/RNASeqDashboard';
import RNASeqUpload from '../pages/RNASeq/RNASeqUpload';
import RNASeqDetail from '../pages/RNASeq/RNASeqDetail';
import RNASeqPresentationCreate from '../pages/RNASeq/RNASeqPresentationCreate';

import AboutUsPage from '../pages/AboutUs';

export default function AppRoutes() {
    return (
        <Routes>
            {/* 🌐 Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* 🧠 Generator + Editor */}
            <Route
                path="/ImageGenerator"
                element={
                    <PrivateRoute>
                        <ImageGenerator />
                    </PrivateRoute>
                }
            />
            <Route
                path="/ImageEdit"
                element={
                    <PrivateRoute>
                        <ImageEditingTool />
                    </PrivateRoute>
                }
            />

            {/* 🧪 Community */}
            <Route
                path="/community"
                element={
                    <PrivateRoute>
                        <CommunityPage />
                    </PrivateRoute>
                }
            />

            <Route
                path="/community/my"
                element={
                    <PrivateRoute>
                        <MyCommunitiesPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/community/create"
                element={
                    <PrivateRoute>
                        <CommunityCreatePage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/community/:groupId"
                element={
                    <PrivateRoute>
                        <CommunityDetailPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/community/image/:imageId"
                element={
                    <PrivateRoute>
                        <ImageDetailPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/community/remix/:imageId"
                element={
                    <PrivateRoute>
                        <RemixPage />
                    </PrivateRoute>
                }
            />

            {/* 👤 Profile */}
            <Route
                path="/profile/:username"
                element={
                    <PrivateRoute>
                        <UserProfilePage />
                    </PrivateRoute>
                }
            />

            <Route
                path="/profile/edit"
                element={
                    <PrivateRoute>
                        <EditUserProfilePage />
                    </PrivateRoute>
                }
            />

            {/* 🏆 Challenges */}
            <Route
                path="/challenges"
                element={
                    <PrivateRoute>
                        <ChallengePage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/challenges/:challengeId"
                element={
                    <PrivateRoute>
                        <ChallengeDetailPage />
                    </PrivateRoute>
                }
            />

            <Route
                path="/leaderboard"
                element={
                    <PrivateRoute>
                        <LeaderboardPage />
                    </PrivateRoute>
                }
            />

            <Route 
                path="/presentations" 
                element={
                    <PrivateRoute>
                        <PresentationsListPage />
                    </PrivateRoute>
                } 
            />
            
            <Route
                path="/presentation/create"
                element={
                    <PrivateRoute>
                        <CreatePresentationPage />
                    </PrivateRoute>
                }
            />
            <Route
                path="/presentation/:id"
                element={
                    <PrivateRoute>
                        <PresentationPage />
                    </PrivateRoute>
                }
            />
            
            {/* 🧬 RNA-seq Analysis */}
            <Route
                path="/rnaseq"
                element={
                    <PrivateRoute>
                        <RNASeqDashboard />
                    </PrivateRoute>
                }
            />
            <Route
                path="/rnaseq/upload"
                element={
                    <PrivateRoute>
                        <RNASeqUpload />
                    </PrivateRoute>
                }
            />
            <Route
                path="/rnaseq/dataset/:id"
                element={
                    <PrivateRoute>
                        <RNASeqDetail />
                    </PrivateRoute>
                }
            />
            <Route
                path="/rnaseq/presentation/:id"
                element={
                    <PrivateRoute>
                        <RNASeqPresentationCreate />
                    </PrivateRoute>
                }
            />
            
            {/* 💳 Payments */}
            <Route
                path="/subscribe"
                element={
                    <PrivateRoute>
                        <StripeSubscription />
                    </PrivateRoute>
                }
            />
            {/* 📖 About Us */}
            <Route
                path="/About-us"
                element={
                    <PrivateRoute>
                        <AboutUsPage />
                    </PrivateRoute>
                }
            />
            {/* 🚫 404 Catch-All */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
