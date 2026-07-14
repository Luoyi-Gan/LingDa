// shadcn Card + Bento 变体
import { forwardRef } from 'react';
import { cn } from '../../lib/cn';

const Card = forwardRef(({ className, interactive = false, bento = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      bento
        ? 'rounded-bento border border-border bg-card text-card-foreground shadow-bento transition-all duration-200 ease-out'
        : 'rounded-lg border border-border bg-card text-card-foreground shadow-sm',
      interactive &&
        'cursor-pointer hover:shadow-bento-hover hover:-translate-y-0.5 active:translate-y-0',
      className,
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-heading text-lg font-bold leading-tight tracking-tight', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-5 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
