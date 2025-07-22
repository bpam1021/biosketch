import { CommunityGroup } from "../../types/CommunityTypes";
import { useNavigate } from "react-router-dom";
import { Lock, Users2, ImageIcon } from "lucide-react";

interface Props {
  group: CommunityGroup;
}

const CommunityCard: React.FC<Props> = ({ group }) => {
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-xl shadow border hover:shadow-lg transition cursor-pointer p-4"
      onClick={() => navigate(`/community/${group.id}`)}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800 truncate">
          {group.name}
        </h2>
        {group.privacy === "private" && (
          <span className="relative group">
            <Lock size={16} className="text-red-500" />
            <span className="sr-only">Private Group</span>
          </span>
        )}
      </div>

      <div className="text-sm text-gray-500 mb-3 line-clamp-2">
        {group.compliance_rules || "No compliance_rules provided."}
      </div>

      <div className="flex flex-wrap items-center text-xs text-gray-600 gap-3">
        <div className="flex items-center gap-1">
          <Users2 size={14} />
          {group.member_count} members
        </div>
        <div className="flex items-center gap-1">
          <ImageIcon size={14} />
          {group.post_count} images
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-gray-400">By</span>
          <span className="text-blue-600 font-medium">@{group.creator_username}</span>
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;
