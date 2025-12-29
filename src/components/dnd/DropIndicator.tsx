interface DropIndicatorProps {
  isVisible: boolean;
  className?: string;
}

/**
 * Blue horizontal line showing where a dragged block will land.
 */
export function DropIndicator({
  isVisible,
  className = "",
}: DropIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div
      className={`
        absolute left-0 right-0
        h-0.5 bg-blue-500
        z-10
        transition-opacity duration-100
        ${className}
      `}
      style={{
        boxShadow: "0 0 4px rgba(59, 130, 246, 0.5)",
      }}
    />
  );
}
