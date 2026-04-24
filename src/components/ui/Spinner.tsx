interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-primary-500 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={32} />
    </div>
  );
}
