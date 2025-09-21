import { Crown, LayoutDashboard, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import UserAvatar from '@/components/UserAvatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { getAdminUserStats, getHealth, type AdminUserStats } from '@/utils/api';

export default function AdminPage() {
  useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<{
    service: string;
    version: string;
  } | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await getAdminUserStats();
        setUsers(response.data.data ?? response.data);
        setIsAdmin(true);
      } catch (error: any) {
        const status = error?.response?.status;
        if (status !== 401 && status !== 403) {
          toast.error('Could not load admin data');
        }
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();

    getHealth()
      .then((res) => setHealth(res.data.data))
      .catch(() => {});
  }, []);

  if (loading) return <LoadingSpinner />;
  if (isAdmin === false) return <Navigate to="/dashboard" replace />;

  return (
    <PageShell title="Admin" description="System overview and user management">
      <section className="grid gap-4 grid-cols-3">
        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Users
                </p>
                <p className="text-lg lg:text-2xl font-semibold">
                  {users.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-emerald-500/10">
                <LayoutDashboard className="size-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Tasks
                </p>
                <p className="text-lg lg:text-2xl font-semibold">
                  {users.reduce((sum, u) => sum + u.workItemCount, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="p-1 md:p-2">
          <CardContent className="p-2">
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex size-12 items-center justify-center rounded-lg bg-amber-500/10">
                <Crown className="size-6 text-amber-500" />
              </div>
              <div>
                <p className="text-xs lg:text-sm text-muted-foreground">
                  Service
                </p>
                <p className="text-lg lg:text-2xl font-semibold">
                  {health?.version ?? 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Work Items</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(({ user, workItemCount, completedCount }) => {
                  const completion = workItemCount
                    ? Math.round((completedCount / workItemCount) * 100)
                    : 0;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            src={user.avatarUrl}
                            name={user.displayName ?? user.email}
                            className="size-8"
                          />
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {user.displayName ?? 'Unnamed'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {user.roles.map((role) => (
                            <Badge
                              key={role}
                              variant={
                                role === 'admin' ? 'default' : 'secondary'
                              }
                              className="text-xs"
                            >
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{workItemCount}</TableCell>
                      <TableCell>
                        <div className="min-w-32 space-y-2">
                          <div className="flex justify-between gap-3 text-sm">
                            <span>
                              {completedCount}/{workItemCount}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {completion}%
                            </span>
                          </div>
                          <Progress value={completion} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
