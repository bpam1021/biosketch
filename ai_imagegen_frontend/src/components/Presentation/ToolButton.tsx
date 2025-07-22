interface ToolButtonProps {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean; // <-- Add this line
}

export const ToolButton: React.FC<ToolButtonProps> = ({ onClick, label, icon, disabled }) => (
  <button
    onClick={onClick}
    title={label}
    disabled={disabled}
    className={`
      flex items-center justify-center w-10 h-10 text-gray-700 bg-white border border-gray-300 rounded 
      hover:bg-gray-200 transition
      ${disabled ? "opacity-50 cursor-not-allowed" : ""}
    `}
  >
    {icon}
  </button>
);
