import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Pencil,
  RefreshCw,
  Settings,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ActivityLog from '@/components/ActivityLog';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import ServerErrorFrame from '@/components/ServerErrorFrame';
import UserAvatar from '@/components/UserAvatar';
import UserProfileDrawer from '@/components/UserProfileDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import {
  getHealth,
  getOrganizations,
  getWorkItems,
  type Organization,
  type WorkItem,
} from '@/utils/api';

interface HealthPayload {
  status: string;
  service: string;
  version: string;
  uptime: number;
}

const profileFields = [
  'displayName',
  'avatarUrl',
  'bio',
  'title',
  'company',
  'location',
] as const;

const formatUptime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);

  if (minutes < 1) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m`;

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

export default function DashboardPage() {
  const { user, firebaseUser, loading, error, refreshProfile, clearError } =
    useAuth();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(false);
  const { selectedOrgId, setContext } = useWorkspaceContext();

  const loadHealth = () => {
    setHealthLoading(true);
    setHealthError(false);
    getHealth()
      .then((res) => setHealth(res.data.data))
      .catch(() => setHealthError(true))
      .finally(() => {
        setHealthLoading(false);
      });
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      const res = await getOrganizations(user!.id);
      return (res.data.data ?? res.data) as Organization[];
    },
    enabled: !!user,
  });

  const { data: workItems = [], isLoading: workItemsLoading } = useQuery<
    WorkItem[]
  >({
    queryKey: ['workItems', selectedOrgId ?? user?.id],
    queryFn: async () => {
      const res = await getWorkItems(user!.id, selectedOrgId);
      return (res.data.data ?? res.data) as WorkItem[];
    },
    enabled: !!user,
  });

  const completion = useMemo(() => {
    if (!user) return 0;
    const complete = profileFields.filter((field) =>
      Boolean(user[field]?.trim()),
    );
    return Math.round((complete.length / profileFields.length) * 100);
  }, [user]);

  const handleRetry = () => {
    clearError();
    refreshProfile();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ServerErrorFrame onRetry={handleRetry} />;
  if (!user) return null;

  const avatarSrc = user.avatarUrl ?? firebaseUser?.photoURL ?? undefined;
  const displayName = user.displayName || 'New account';
  const apiStatus = healthLoading
    ? 'Checking'
    : healthError
      ? 'Offline'
      : 'Online';

  const doneItems = workItems.filter((i) => i.status === 'done').length;
  const openItems = workItems.length - doneItems;
  const highPriority = workItems.filter(
    (i) => i.priority === 'high' && i.status !== 'done',
  ).length;
  const nextItems = workItems.filter((i) => i.status !== 'done').slice(0, 20);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleContextChange = (v: string) => {
    setContext(v === '__personal__' ? undefined : v);
  };

  return (
    <PageShell
      title="Dashboard"
      description="A concise view of account, API, and workspace activity."
      actions={
        organizations.length > 0 ? (
          <Select
            value={selectedOrgId ?? '__personal__'}
            onValueChange={handleContextChange}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__personal__">Personal</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : undefined
      }
    >
      <Card>
        <CardContent>
          <div className="flex flex-row-reverse md:flex-row items-start gap-4">
            <button
              type="button"
              onClick={() => setProfileUserId(user.id)}
              aria-label="View profile"
            >
              <UserAvatar
                src={avatarSrc}
                name={displayName}
                className="size-16"
              />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 lg:flex-nowrap lg:justify-between">
                <button
                  type="button"
                  className="block min-w-0 text-left"
                  onClick={() => setProfileUserId(user.id)}
                >
                  <p className="truncate text-xl font-semibold">
                    {displayName}
                  </p>
                </button>
                {(user.title || user.company) && (
                  <p className="flex w-full basis-full items-center gap-1.5 truncate text-sm text-muted-foreground lg:hidden">
                    <BriefcaseBusiness className="size-4 shrink-0" />
                    {[user.title, user.company].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={healthError ? 'destructive' : 'secondary'}>
                    API {apiStatus}
                    {health && !healthError && (
                      <span className="ml-1 opacity-60">
                        · {formatUptime(health.uptime)}
                      </span>
                    )}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={loadHealth}
                    disabled={healthLoading}
                  >
                    <RefreshCw />
                  </Button>
                  <Button asChild variant="ghost" size="icon-sm">
                    <Link to="/settings">
                      <Settings />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/profile">
                      <Pencil />
                      Edit profile
                    </Link>
                  </Button>
                </div>
              </div>
              {(user.title || user.company) && (
                <p className="mt-0.5 hidden items-center gap-1.5 truncate text-sm text-muted-foreground lg:flex">
                  <BriefcaseBusiness className="size-4 shrink-0" />
                  {[user.title, user.company].filter(Boolean).join(' · ')}
                </p>
              )}
              {completion < 100 && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <UserRound className="size-3" />
                      Profile completeness
                    </span>
                    <span>{completion}%</span>
                  </div>
                  <Progress value={completion} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="grid w-full grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Total items</p>
              <p className="mt-0.5 text-xl font-semibold">
                {workItemsLoading ? '…' : workItems.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Open</p>
              <p className="mt-0.5 flex items-center gap-1 text-xl font-semibold">
                {workItemsLoading ? '…' : openItems}
                {!workItemsLoading && openItems > 0 && (
                  <TrendingUp className="size-4 text-muted-foreground" />
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="mt-0.5 flex items-center gap-1 text-xl font-semibold">
                {workItemsLoading ? '…' : doneItems}
                {!workItemsLoading && doneItems > 0 && (
                  <CheckCircle2 className="size-4 text-muted-foreground" />
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">High priority</p>
              <p className="mt-0.5 flex items-center gap-1 text-xl font-semibold">
                {workItemsLoading ? '…' : highPriority}
                {!workItemsLoading && highPriority > 0 && (
                  <AlertTriangle className="size-4 text-amber-500" />
                )}
              </p>
            </div>
          </div>
        </CardFooter>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        <ActivityLog organizationId={selectedOrgId} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              Next up
              <Button asChild variant="ghost" size="sm">
                <Link to="/workspace">Open workspace</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pr-1">
            {workItemsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : nextItems.length ? (
              <ScrollArea className="h-[calc(100vh-28.2rem)] pr-3">
                <ItemGroup>
                  {nextItems.map((item) => (
                    <Item key={item.id} variant="outline">
                      <ItemContent>
                        <ItemTitle>{item.title}</ItemTitle>
                        <ItemDescription>
                          {item.dueDate ?? 'No due date'}
                          {item.assignee && (
                            <span className="ml-2">
                              ·{' '}
                              {item.assignee.displayName ?? item.assignee.email}
                            </span>
                          )}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Badge
                          variant={
                            item.priority === 'high' ? 'default' : 'secondary'
                          }
                        >
                          {item.priority}
                        </Badge>
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground">
                No open work items.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <UserProfileDrawer
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={(id) => navigate(`/chat?peer=${id}`)}
        currentUserId={user.id}
      />
    </PageShell>
  );
}
