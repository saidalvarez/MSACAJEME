interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton = ({ className = '', variant = 'rect' }: SkeletonProps) => {
  const variantClasses = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'rounded-md h-4 w-full'
  };

  return (
    <div 
      className={`shimmer bg-white/5 ${variantClasses[variant]} ${className}`}
      aria-hidden="true"
    />
  );
};
