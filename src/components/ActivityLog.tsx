import { formatDistanceToNow } from 'date-fns';
import {
  Building2,
  CheckCircle2,
  FilePlus,
  MessageSquare,
  Pencil,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { getActivities, type Activity, type ActivityType } from '@/utils/api';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from './ui/item';

const activityIcons: Record<ActivityType, typeof FilePlus> = {
  comment_created: MessageSquare,
  comment_deleted: MessageSquare,
  organization_created: Building2,
  organization_updated: Pencil,
  organization_deleted: Trash2,
  organization_member_added: Users,
  work_item_created: FilePlus,
  work_item_updated: Pencil,
  work_item_deleted: Trash2,
  work_item_status_changed: CheckCircle2,
  profile_updated: User,
  user_login: User,
};

const activityColors: Record<ActivityType, string> = {
  comment_created: 'text-cyan-500',
  comment_deleted: 'text-red-500',
  organization_created: 'text-emerald-500',
  organization_updated: 'text-blue-500',
  organization_deleted: 'text-red-500',
  organization_member_added: 'text-indigo-500',
  work_item_created: 'text-emerald-500',
  work_item_updated: 'text-blue-500',
  work_item_deleted: 'text-red-500',
  work_item_status_changed: 'text-amber-500',
  profile_updated: 'text-purple-500',
  user_login: 'text-slate-500',
};

const parseActivityDate = (value: string) => {
  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
};

export default function ActivityLog({
  organizationId,
}: {
  organizationId?: string;
} = {}) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getActivities(user.id, 20, organizationId)
      .then((res) => {
        setActivities(res.data.data ?? res.data ?? []);
      })
      .catch(() => toast.error('Could not load activity log'))
      .finally(() => setLoading(false));
  }, [user?.id, organizationId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="pr-1">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading activity…</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ScrollArea className="h-[calc(100vh-28.2rem)] pr-3">
            <ItemGroup>
              {activities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const colorClass = activityColors[activity.type];

                return (
                  <Item key={activity.id} variant="outline">
                    <ItemMedia variant="icon">
                      <Icon className={`size-4 ${colorClass}`} />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{activity.description}</ItemTitle>
                      <ItemDescription>
                        {formatDistanceToNow(
                          parseActivityDate(activity.createdAt),
                          {
                            addSuffix: true,
                          },
                        )}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                );
              })}
            </ItemGroup>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
