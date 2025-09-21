import { UserRound } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

export default function UserAvatar({
  src,
  name,
  className,
  fallbackClassName,
}: UserAvatarProps) {
  return (
    <Avatar className={cn('shadow-sm', className)}>
      <AvatarImage src={src ?? undefined} alt={name ?? ''} />
      <AvatarFallback className={fallbackClassName}>
        <UserRound className="size-[55%] text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}
