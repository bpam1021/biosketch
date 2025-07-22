import React, { ReactNode } from "react";
import { useSwipeable } from "react-swipeable";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactElement<TabProps>[];
  collapsed?: boolean;
}

interface TabProps {
  value: string;
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onValueChange,
  className = "",
  children,
  collapsed = false,
}) => {
  const tabValues = children.map((child) => child.props.value);
  const currentIndex = tabValues.indexOf(value);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentIndex < tabValues.length - 1) {
        onValueChange(tabValues[currentIndex + 1]);
      }
    },
    onSwipedRight: () => {
      if (currentIndex > 0) {
        onValueChange(tabValues[currentIndex - 1]);
      }
    },
    trackMouse: true,
  });

  return (
    <div className={`flex flex-col w-full h-full ${className}`}>
      {/* Tab Header Buttons */}
      <div
        className={`flex ${collapsed ? "flex-col" : "flex-row"} gap-1 bg-gray-900 rounded-t-lg p-1 overflow-x-auto scrollbar-hide border-b border-gray-700`}
      >
        {children.map((child) => (
          <button
            key={child.props.value}
            onClick={() => onValueChange(child.props.value)}
            className={`group relative flex items-center justify-center transition-all whitespace-nowrap rounded-lg
              ${collapsed ? "w-12 h-12" : "px-3 py-2"}
              ${
                value === child.props.value
                  ? "bg-gray-900 text-gray-100 shadow-sm font-semibold"
                  : "text-gray-100 hover:bg-gray-700"
              }`}
            title={collapsed ? child.props.value : undefined}
          >
            {collapsed && child.props.icon ? (
              <>
                <span>{child.props.icon}</span>
                <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {child.props.title}
                </span>
              </>
            ) : (
              child.props.title
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        {...swipeHandlers}
        className="flex-1 p-2 bg-gray-900 rounded-b-lg border border-t-0 shadow-inner overflow-y-auto select-none"
      >
        {children.map((child) =>
          child.props.value === value ? (
            <div
              key={child.props.value}
              className="w-full h-full animate-fade-in"
            >
              {child.props.children}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
};

export const Tab: React.FC<TabProps> = ({ children }) => <>{children}</>;