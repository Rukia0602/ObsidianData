import { BRAND_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface BrandWordmarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
  sm: 'text-base',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
};

export default function BrandWordmark({ className, size = 'md' }: BrandWordmarkProps) {
  const [prefix, suffix] = [BRAND_NAME.slice(0, 8), BRAND_NAME.slice(8)];
  return (
    <span
      className={cn(
        'font-display tracking-tight font-semibold',
        sizeClass[size],
        className,
      )}
      style={{ textWrap: 'balance' }}
    >
      <span className="text-primary">{prefix}</span>
      <span className="text-accent">{suffix}</span>
    </span>
  );
}
