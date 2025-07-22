import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
  } from 'react';
  import {
    getMyProfile,
    updateUserProfile,
    changePassword,
    deleteAccount,
    getNotificationSettings,
    updateNotificationSettings,
  } from '../api/profileApi';
  import { toast } from 'react-toastify';
  
  interface Profile {
    id: number;
    username: string;
    email: string;
    bio?: string;
    first_name?: string;
    last_name?: string;
    profile_picture?: string;
    profile_visibility?: string;
    phone_number?: string;
    credits?: number;
    total_images_generated?: number;
    total_images_published?: number;
    total_challenge_entries?: number;
    total_community_posts?: number;
    total_likes_received?: number;
    challenges_won?: number;
  }
  
  interface NotificationSettings {
    email_notifications: boolean;
    push_notifications: boolean;
    new_follower_alert: boolean;
    challenge_update_alert: boolean;
  }
  
  interface ProfileContextType {
    profile: Profile | null;
    notifications: NotificationSettings | null;
    loading: boolean;
    fetchProfile: () => Promise<void>;
    fetchNotifications: () => Promise<void>;
    updateProfile: (formData: FormData | object) => Promise<void>;
    changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
    updateNotifications: (data: object) => Promise<void>;
    removeAccount: () => Promise<void>;
  }
  
  const ProfileContext = createContext<ProfileContextType | undefined>(undefined);
  
  export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) {
      throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
  };
  
  export const ProfileProvider = ({ children }: { children: ReactNode }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
  
    const fetchProfile = async () => {
      try {
        const res = await getMyProfile();
        setProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
  
    const fetchNotifications = async () => {
      try {
        const res = await getNotificationSettings();
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
  
    const updateProfileHandler = async (formData: FormData | object) => {
      try {
        await updateUserProfile(formData);
        toast.success('✅ Profile updated!');
        fetchProfile(); // Refresh profile
      } catch (err) {
        console.error('Profile update failed:', err);
        toast.error('❌ Profile update failed.');
      }
    };
  
    const updateNotifications = async (data: object) => {
      try {
        await updateNotificationSettings(data);
        toast.success('🔔 Notification settings saved');
        fetchNotifications();
      } catch (err) {
        console.error('Failed to update notifications:', err);
        toast.error('❌ Could not update notifications.');
      }
    };
  
    const changePasswordHandler = async (oldPassword: string, newPassword: string) => {
      try {
        await changePassword(oldPassword, newPassword);
        toast.success('🔑 Password changed successfully.');
      } catch (err) {
        console.error('Password change failed:', err);
        toast.error('❌ Incorrect current password.');
      }
    };
  
    const removeAccount = async () => {
      try {
        await deleteAccount();
        toast.success('🗑️ Account deleted');
      } catch (err) {
        console.error('Failed to delete account:', err);
        toast.error('❌ Could not delete account.');
      }
    };
  
    useEffect(() => {
      const init = async () => {
        if (localStorage.getItem('access_token')) {
          await fetchProfile();
          await fetchNotifications();
        }
        setLoading(false);
      };
      init();
    }, []);
  
    return (
      <ProfileContext.Provider
        value={{
          profile,
          notifications,
          loading,
          fetchProfile,
          fetchNotifications,
          updateProfile: updateProfileHandler,
          changePassword: changePasswordHandler,
          updateNotifications,
          removeAccount,
        }}
      >
        {!loading && children}
      </ProfileContext.Provider>
    );
  };
  