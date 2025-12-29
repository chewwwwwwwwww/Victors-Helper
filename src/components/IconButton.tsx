import { type ReactNode, useState } from "react";

interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  variant = "default",
}: IconButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const variantClasses = {
    default:
      "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400",
    primary:
      "hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    danger:
      "hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400",
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`p-2 rounded-lg transition-colors ${variantClasses[variant]} ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
        aria-label={label}
      >
        {icon}
      </button>

      {/* Tooltip */}
      {showTooltip && !disabled && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap z-50 pointer-events-none">
          {label}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full border-4 border-transparent border-b-gray-900 dark:border-b-gray-700" />
        </div>
      )}
    </div>
  );
}
