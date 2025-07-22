import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  description?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  className = "",
}) => {
  return (
    <div
      className={`bg-white shadow rounded-lg p-4 border border-gray-200 flex items-center ${className}`}
    >
      {icon && (
        <div className="mr-4 text-blue-500 text-2xl">
          {icon}
        </div>
      )}
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="text-xl font-bold text-gray-800">{value}</div>
        {description && (
          <div className="text-xs text-gray-400 mt-1">{description}</div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
