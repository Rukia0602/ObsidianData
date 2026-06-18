import { BRAND_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface BrandWordmarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'text-lg',
  md: 'text-4xl md:text-5xl',
  lg: 'text-5xl md:text-6xl',
};

export default function BrandWordmark({ className, size = 'md' }: BrandWordmarkProps) {
  const [prefix, suffix] = [BRAND_NAME.slice(0, 8), BRAND_NAME.slice(8)];
  return (
    <span className={cn('font-display tracking-tight', sizeClass[size], className)}>
      <span className="text-frost">{prefix}</span>
      <span className="text-gradient-prism">{suffix}</span>
    </span>
  );
}