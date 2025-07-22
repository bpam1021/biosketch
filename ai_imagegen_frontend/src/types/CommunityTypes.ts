export interface CommunityGroup {
    id: number;
    name: string;
    description: string;
    compliance_rules?: string;
    privacy: "public" | "private";
    group_image?: string;
    created_at: string;
    creator_username: string;
    member_count: number;
    post_count: number;
    is_approved: boolean;
    is_banned: boolean;
    is_deleted: boolean;
  }
  
  export interface CommunityMember {
    id: number;
    user: number;
    user_username: string;
    profile_image?: string;
    community: number;
    role: "member" | "admin";
    joined_at: string;
  }
  
  export interface CommunityPost {
    id: number;
    community: number;
    community_name: string;
    user: number;
    user_username: string;
    title: string;
    content?: string;
    image?: string;
    created_at: string;
    updated_at: string;
    likes_count?: number;
  }
  
  export interface CommunityComment {
    id: number;
    post: number;
    user: number;
    user_username: string;
    content: string;
    created_at: string;
  }
  