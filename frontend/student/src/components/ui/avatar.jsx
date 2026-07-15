import { forwardRef } from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '../../lib/cn';
import { inkOn } from '../../lib/avatar';

const Avatar = forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full',
      className,
    )}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = forwardRef(({ className, style, ...props }, ref) => {
  const bg = style?.background || style?.backgroundColor;
  const ink = bg ? inkOn(String(bg)) : undefined;
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      style={ink ? { ...style, color: ink } : style}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted font-semibold',
        !ink && 'text-foreground/80',
        className,
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
