import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  LayoutGrid,
  ListTodo,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Table2,
  Trash2,
  TrendingUp,
  UserCircle2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import KanbanBoard from '@/components/KanbanBoard';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from '@/components/ui/responsive-modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import UserAvatar from '@/components/UserAvatar';
import UserProfileDrawer from '@/components/UserProfileDrawer';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceContext } from '@/hooks/use-workspace-context';
import { useWorkspaceSocket } from '@/hooks/use-workspace-socket';
import {
  createWorkItem,
  createWorkItemComment,
  deleteWorkItem,
  deleteWorkItemComment,
  getOrganizationMembers,
  getOrganizations,
  getWorkItemComments,
  getWorkItems,
  reorderWorkItems,
  updateWorkItem,
  updateWorkItemComment,
  type Organization,
  type OrganizationMember,
  type WorkItem,
  type WorkItemComment,
  type WorkItemPriority,
  type WorkItemStatus,
} from '@/utils/api';
import { useNavigate } from 'react-router-dom';

const statusLabels: Record<WorkItemStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

const priorityLabels: Record<WorkItemPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const emptyForm = {
  title: '',
  description: '',
  status: 'todo' as WorkItemStatus,
  priority: 'medium' as WorkItemPriority,
  dueDate: '',
  assigneeId: '' as string,
};

type WorkItemForm = typeof emptyForm;

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const toWorkItemForm = (item: WorkItem): WorkItemForm => ({
  title: item.title,
  description: item.description ?? '',
  status: item.status,
  priority: item.priority,
  dueDate: item.dueDate ?? '',
  assigneeId: item.assigneeId ?? '',
});

const workspaceViewStorageKey = 'workspace:view';

const getInitialWorkspaceView = (): 'table' | 'kanban' => {
  if (typeof window === 'undefined') return 'table';
  return localStorage.getItem(workspaceViewStorageKey) === 'kanban'
    ? 'kanban'
    : 'table';
};

export default function WorkspacePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailTitleRef = useRef<HTMLInputElement | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<WorkItem | null>(null);
  const [commentDeleteTarget, setCommentDeleteTarget] =
    useState<WorkItemComment | null>(null);
  const [editingComment, setEditingComment] = useState<{
    id: string;
    body: string;
  } | null>(null);
  const [detailItem, setDetailItem] = useState<WorkItem | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');
  const [commentBody, setCommentBody] = useState('');
  const [view, setView] = useState<'table' | 'kanban'>(getInitialWorkspaceView);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { selectedOrgId, setContext } = useWorkspaceContext();

  // ── Organizations query ─────────────────────────────────────────────────────
  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ['organizations', user?.id],
    queryFn: async () => {
      const res = await getOrganizations(user!.id);
      return (res.data.data ?? res.data) as Organization[];
    },
    enabled: !!user,
  });

  const orgIds = useMemo(() => organizations.map((o) => o.id), [organizations]);

  useWorkspaceSocket(user?.id, orgIds);

  // ── Org members query (for assignee selector) ────────────────────────────────
  const { data: orgMembers = [] } = useQuery<OrganizationMember[]>({
    queryKey: ['orgMembers', selectedOrgId],
    queryFn: async () => {
      const res = await getOrganizationMembers(user!.id, selectedOrgId!);
      return (res.data.data ?? res.data) as OrganizationMember[];
    },
    enabled: !!user && !!selectedOrgId,
  });

  const updateView = (nextView: 'table' | 'kanban') => {
    setView(nextView);
    localStorage.setItem(workspaceViewStorageKey, nextView);
  };

  // ── Work items query ────────────────────────────────────────────────────────
  const workItemsKey = ['workItems', selectedOrgId ?? user?.id] as const;

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: workItemsKey,
    queryFn: async () => {
      const res = await getWorkItems(user!.id, selectedOrgId);
      return (res.data.data ?? res.data) as WorkItem[];
    },
    enabled: !!user,
  });

  // ── Comments query ──────────────────────────────────────────────────────────
  const commentsKey = ['comments', detailItem?.id] as const;

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: commentsKey,
    queryFn: async () => {
      const res = await getWorkItemComments(user!.id, detailItem!.id);
      return (res.data.data ?? res.data ?? []) as WorkItemComment[];
    },
    enabled: !!user && !!detailItem,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: ReturnType<typeof buildPayload>) =>
      createWorkItem(user!.id, payload, selectedOrgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workItemsKey });
      toast.success('Work item created');
      setForm(emptyForm);
      setDialogOpen(false);
    },
    onError: () => toast.error('Could not create work item'),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<ReturnType<typeof buildPayload>>;
    }) => updateWorkItem(user!.id, id, payload, selectedOrgId),
    onSuccess: (res) => {
      const updated: WorkItem = res.data.data ?? res.data;
      queryClient.setQueryData<WorkItem[]>(workItemsKey, (old = []) =>
        old.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDetailItem((current) =>
        current?.id === updated.id ? updated : current,
      );
      setDetailMode('view');
      toast.success('Work item updated');
    },
    onError: () => toast.error('Could not update work item'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkItemStatus }) =>
      updateWorkItem(user!.id, id, { status }, selectedOrgId),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: workItemsKey });
      const previous = queryClient.getQueryData<WorkItem[]>(workItemsKey);
      queryClient.setQueryData<WorkItem[]>(workItemsKey, (old = []) =>
        old.map((item) => (item.id === id ? { ...item, status } : item)),
      );
      setDetailItem((current) =>
        current?.id === id ? { ...current, status } : current,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(workItemsKey, ctx.previous);
      toast.error('Could not update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWorkItem(user!.id, id, selectedOrgId),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<WorkItem[]>(workItemsKey, (old = []) =>
        old.filter((item) => item.id !== id),
      );
    },
    onError: () => toast.error('Could not delete work item'),
  });

  const addCommentMutation = useMutation({
    mutationFn: (body: string) =>
      createWorkItemComment(user!.id, detailItem!.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      setCommentBody('');
      toast.success('Comment added');
    },
    onError: () => toast.error('Could not add comment'),
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      updateWorkItemComment(user!.id, detailItem!.id, id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      setEditingComment(null);
      toast.success('Comment updated');
    },
    onError: () => toast.error('Could not update comment'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: string) =>
      deleteWorkItemComment(user!.id, detailItem!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentsKey });
      toast.success('Comment deleted');
    },
    onError: () => toast.error('Could not delete comment'),
    onSettled: () => setCommentDeleteTarget(null),
  });

  // ── Derived state ───────────────────────────────────────────────────────────
  const completion = useMemo(() => {
    if (!items.length) return 0;
    return Math.round(
      (items.filter((item) => item.status === 'done').length / items.length) *
        100,
    );
  }, [items]);

  const visibleItems = (status?: WorkItemStatus) =>
    status ? items.filter((item) => item.status === status) : items;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const buildPayload = (includeEmptyDueDate = false) => ({
    title: form.title.trim(),
    description: form.description.trim() || '',
    status: form.status,
    priority: form.priority,
    dueDate: form.dueDate || (includeEmptyDueDate ? null : undefined),
    assigneeId: form.assigneeId || (includeEmptyDueDate ? null : undefined),
  });

  const openCreateDialog = () => {
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openDetails = (item: WorkItem) => {
    setDetailItem(item);
    setDetailMode('view');
    setCommentBody('');
  };

  const openEditDrawer = (item: WorkItem) => {
    setDetailItem(item);
    setDetailMode('edit');
    setForm(toWorkItemForm(item));
    setCommentBody('');
  };

  const startDetailEdit = () => {
    if (!detailItem) return;
    setForm(toWorkItemForm(detailItem));
    setDetailMode('edit');
  };

  const cancelDetailEdit = () => {
    if (detailItem) setForm(toWorkItemForm(detailItem));
    setDetailMode('view');
  };

  const handleCreateSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!user || !form.title.trim()) return;
    createMutation.mutate(buildPayload());
  };

  const saveDetailItem = () => {
    if (!user || !detailItem) return;
    if (!form.title.trim()) {
      detailTitleRef.current?.reportValidity();
      return;
    }
    updateMutation.mutate({ id: detailItem.id, payload: buildPayload(true) });
  };

  const handleDetailSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveDetailItem();
  };

  const handleStatusChange = (item: WorkItem, status: WorkItemStatus) => {
    if (!user) return;
    statusMutation.mutate({ id: item.id, status });
  };

  const handleStatusReorder = (
    item: WorkItem,
    status: WorkItemStatus,
    orderedItems: WorkItem[],
  ) => {
    if (!user) return;
    queryClient.setQueryData<WorkItem[]>(workItemsKey, orderedItems);
    statusMutation.mutate({ id: item.id, status });
    void reorderWorkItems(
      user.id,
      orderedItems.map((i, idx) => ({ id: i.id, position: idx })),
      selectedOrgId,
    );
  };

  const submitComment = () => {
    if (!commentBody.trim()) return;
    addCommentMutation.mutate(commentBody.trim());
  };

  const saveCommentEdit = () => {
    if (!editingComment?.body.trim()) return;
    updateCommentMutation.mutate({
      id: editingComment.id,
      body: editingComment.body.trim(),
    });
  };

  const confirmDeleteComment = () => {
    if (!commentDeleteTarget) return;
    deleteCommentMutation.mutate(commentDeleteTarget.id);
  };

  // Undo-delete: show toast immediately, delay the API call by 5s
  const requestDelete = (target: WorkItem) => {
    setDeleteTarget(null);
    if (target.id === detailItem?.id) {
      setDetailItem(null);
      setDetailMode('view');
    }
    // Optimistically remove from UI
    queryClient.setQueryData<WorkItem[]>(workItemsKey, (old = []) =>
      old.filter((item) => item.id !== target.id),
    );
    const timer = setTimeout(() => {
      deleteMutation.mutate(target.id);
    }, 5000);
    undoTimerRef.current = timer;
    toast('Work item deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timer);
          queryClient.invalidateQueries({ queryKey: workItemsKey });
          toast.dismiss();
        },
      },
      duration: 5000,
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    requestDelete(deleteTarget);
  };

  const requestDeleteFromDetails = () => {
    if (!detailItem) return;
    setDeleteTarget(detailItem);
  };

  if (!user) return null;

  return (
    <PageShell
      title="Workspace"
      description="Plan work, track progress, and persist changes through the API."
      actions={
        <>
          {organizations.length > 0 && (
            <Select
              value={selectedOrgId ?? '__personal__'}
              onValueChange={(v) => {
                setContext(v === '__personal__' ? undefined : v);
                setDetailItem(null);
                setDetailMode('view');
              }}
            >
              <SelectTrigger className="flex-1">
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
          )}
          <Button
            variant="outline"
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: workItemsKey })
            }
          >
            <RefreshCw />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus />
            New item
          </Button>
        </>
      }
    >
      <section className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="mt-1 text-2xl font-semibold">{completion}%</p>
              </div>
              <ListTodo className="hidden size-5 shrink-0 text-muted-foreground sm:block" />
            </div>
            <Progress value={completion} className="hidden w-full sm:block" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Open</p>
              <p className="mt-1 text-2xl font-semibold">
                {items.filter((item) => item.status !== 'done').length}
              </p>
              <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                Not done yet
              </p>
            </div>
            <TrendingUp className="hidden size-5 shrink-0 text-muted-foreground sm:block" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">High priority</p>
              <p className="mt-1 text-2xl font-semibold">
                {items.filter((item) => item.priority === 'high').length}
              </p>
              <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">
                Open &amp; urgent
              </p>
            </div>
            <AlertTriangle className="hidden size-5 shrink-0 text-muted-foreground sm:block" />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Work items</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={view === 'table' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => updateView('table')}
              >
                <Table2 className="size-4 mr-1" />
                Table
              </Button>
              <Button
                variant={view === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => updateView('kanban')}
              >
                <LayoutGrid className="size-4 mr-1" />
                Kanban
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner />
          ) : items.length === 0 ? (
            <Alert>
              <AlertTitle>No work items yet</AlertTitle>
              <AlertDescription>
                Create the first item to start tracking real backend state.
              </AlertDescription>
            </Alert>
          ) : view === 'table' ? (
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="todo">To do</TabsTrigger>
                <TabsTrigger value="in_progress">In progress</TabsTrigger>
                <TabsTrigger value="done">Done</TabsTrigger>
              </TabsList>
              {(['all', 'todo', 'in_progress', 'done'] as const).map((tab) => (
                <TabsContent key={tab} value={tab}>
                  <WorkItemsTable
                    items={tab === 'all' ? items : visibleItems(tab)}
                    onStatusChange={handleStatusChange}
                    onDone={(item) => handleStatusChange(item, 'done')}
                    onEdit={openEditDrawer}
                    onDelete={setDeleteTarget}
                    onOpenDetails={openDetails}
                  />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <KanbanBoard
              items={items}
              onEdit={openEditDrawer}
              onDelete={setDeleteTarget}
              onOpenDetails={openDetails}
              onReorder={(ordered) => {
                queryClient.setQueryData<WorkItem[]>(workItemsKey, ordered);
                void reorderWorkItems(
                  user.id,
                  ordered.map((item, idx) => ({ id: item.id, position: idx })),
                );
              }}
              onStatusReorder={handleStatusReorder}
            />
          )}
        </CardContent>
      </Card>

      <ResponsiveModal
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setForm(emptyForm);
          }
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <ResponsiveModalHeader className="border-b md:border-0">
              <ResponsiveModalTitle className="text-xl">
                New work item
              </ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Fill in the details for your new task.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="space-y-4 p-4 md:p-0">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-10 gap-3">
                <div className="col-span-3 min-w-0 space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: WorkItemStatus) =>
                      setForm((current) => ({ ...current, status: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 min-w-0 space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value: WorkItemPriority) =>
                      setForm((current) => ({ ...current, priority: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-4 min-w-0 space-y-2">
                  <Label htmlFor="dueDate">Due</Label>
                  <DueDatePicker
                    id="dueDate"
                    value={form.dueDate}
                    onChange={(dueDate) =>
                      setForm((current) => ({
                        ...current,
                        dueDate,
                      }))
                    }
                  />
                </div>
              </div>
              {orgMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select
                    value={form.assigneeId || '__none__'}
                    onValueChange={(v) =>
                      setForm((c) => ({
                        ...c,
                        assigneeId: v === '__none__' ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Unassigned</SelectItem>
                      {orgMembers.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user?.displayName ?? m.user?.email ?? m.userId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <ResponsiveModalFooter className="border-t md:border-t">
              <ResponsiveModalClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </ResponsiveModalClose>
              <Button type="submit" disabled={createMutation.isPending}>
                Create
              </Button>
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <Drawer
        open={Boolean(detailItem)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDetailItem(null);
            setDetailMode('view');
          }
        }}
      >
        <DrawerContent className="mx-auto max-w-4xl">
          {detailItem ? (
            <>
              <DrawerHeader>
                <DrawerTitle className="text-xl">
                  {detailMode === 'edit' ? 'Edit work item' : detailItem.title}
                </DrawerTitle>
                <DrawerDescription>
                  {detailMode === 'edit'
                    ? 'Update the work item without leaving the details drawer.'
                    : 'Work item details, comments, and quick actions.'}
                </DrawerDescription>
              </DrawerHeader>
              <Separator />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-5 p-4 md:px-6 md:py-5">
                  {detailMode === 'edit' ? (
                    <form
                      id="work-item-detail-form"
                      onSubmit={handleDetailSubmit}
                      className="space-y-6"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="detail-title">Title</Label>
                        <Input
                          id="detail-title"
                          ref={detailTitleRef}
                          value={form.title}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              title: event.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="detail-description">Description</Label>
                        <Textarea
                          id="detail-description"
                          value={form.description}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid grid-cols-10 gap-3">
                        <div className="col-span-3 min-w-0 space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={form.status}
                            onValueChange={(value: WorkItemStatus) =>
                              setForm((current) => ({
                                ...current,
                                status: value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 min-w-0 space-y-2">
                          <Label>Priority</Label>
                          <Select
                            value={form.priority}
                            onValueChange={(value: WorkItemPriority) =>
                              setForm((current) => ({
                                ...current,
                                priority: value,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(priorityLabels).map(
                                ([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4 min-w-0 space-y-2">
                          <Label htmlFor="detail-dueDate">Due</Label>
                          <DueDatePicker
                            id="detail-dueDate"
                            value={form.dueDate}
                            onChange={(dueDate) =>
                              setForm((current) => ({
                                ...current,
                                dueDate,
                              }))
                            }
                          />
                        </div>
                      </div>
                      {orgMembers.length > 0 && (
                        <div className="space-y-2">
                          <Label>Assignee</Label>
                          <Select
                            value={form.assigneeId || '__none__'}
                            onValueChange={(v) =>
                              setForm((c) => ({
                                ...c,
                                assigneeId: v === '__none__' ? '' : v,
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">
                                Unassigned
                              </SelectItem>
                              {orgMembers.map((m) => (
                                <SelectItem key={m.userId} value={m.userId}>
                                  {m.user?.displayName ??
                                    m.user?.email ??
                                    m.userId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </form>
                  ) : (
                    <>
                      <div className="rounded-xl border bg-card p-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {statusLabels[detailItem.status]}
                          </Badge>
                          <Badge
                            variant={
                              detailItem.priority === 'high'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {priorityLabels[detailItem.priority]} priority
                          </Badge>
                        </div>
                      </div>

                      <section className="space-y-2 rounded-xl border bg-card p-4">
                        <h3 className="text-sm font-medium">Description</h3>
                        <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                          {detailItem.description || 'No description provided.'}
                        </p>
                      </section>

                      <section className="grid gap-3 text-sm md:grid-cols-3">
                        <div
                          className={`flex items-center justify-between gap-4 rounded-xl border bg-card p-4 ${
                            detailItem.assignee
                              ? 'cursor-pointer transition-colors hover:bg-muted/50'
                              : ''
                          }`}
                          onClick={() => {
                            if (detailItem.assignee?.id) {
                              setProfileUserId(detailItem.assignee.id);
                            }
                          }}
                        >
                          <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                            <UserCircle2 className="size-4" />
                            Assignee
                          </span>
                          {detailItem.assignee ? (
                            <span className="flex min-w-0 items-center gap-2">
                              <UserAvatar
                                src={detailItem.assignee.avatarUrl}
                                name={
                                  detailItem.assignee.displayName ??
                                  detailItem.assignee.email
                                }
                                className="size-5 shrink-0"
                              />
                              <span className="truncate font-medium">
                                {detailItem.assignee.displayName ??
                                  detailItem.assignee.email}
                              </span>
                            </span>
                          ) : (
                            <span className="truncate font-medium">
                              Unassigned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="size-4" />
                            Due date
                          </span>
                          <span className="font-medium">
                            {detailItem.dueDate ?? 'No due date'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="size-4" />
                            Updated
                          </span>
                          <span className="font-medium">
                            {new Date(
                              detailItem.updatedAt,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </section>
                    </>
                  )}

                  {detailMode === 'view' && (
                    <>
                      <Separator />

                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="size-4 text-muted-foreground" />
                          <h3 className="text-sm font-medium">Comments</h3>
                        </div>
                        <div className="space-y-2">
                          <Textarea
                            value={commentBody}
                            onChange={(event) =>
                              setCommentBody(event.target.value)
                            }
                            placeholder="Add context for the next person..."
                            onKeyDown={(event) => {
                              if (
                                event.key === 'Enter' &&
                                (event.metaKey || event.ctrlKey)
                              ) {
                                event.preventDefault();
                                submitComment();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={submitComment}
                            disabled={
                              addCommentMutation.isPending ||
                              !commentBody.trim()
                            }
                          >
                            <Send className="size-4" />
                            Add comment
                          </Button>
                        </div>
                        {commentsLoading ? (
                          <p className="text-sm text-muted-foreground">
                            Loading comments…
                          </p>
                        ) : comments.length ? (
                          <div className="space-y-3">
                            {comments.map((comment) => (
                              <div
                                key={comment.id}
                                className="rounded-lg border bg-background p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <button
                                    type="button"
                                    className="shrink-0 rounded-full"
                                    onClick={() =>
                                      setProfileUserId(comment.authorId)
                                    }
                                    aria-label="View profile"
                                  >
                                    <UserAvatar
                                      src={comment.author?.avatarUrl}
                                      name={
                                        comment.author?.displayName ??
                                        comment.author?.email ??
                                        '?'
                                      }
                                      className="size-8"
                                    />
                                  </button>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">
                                      {comment.author?.displayName ??
                                        comment.author?.email ??
                                        'Comment'}
                                    </p>
                                    {editingComment?.id === comment.id ? (
                                      <div className="mt-2 space-y-2">
                                        <Textarea
                                          value={editingComment.body}
                                          onChange={(e) =>
                                            setEditingComment((c) =>
                                              c
                                                ? { ...c, body: e.target.value }
                                                : c,
                                            )
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === 'Enter' &&
                                              (e.metaKey || e.ctrlKey)
                                            ) {
                                              e.preventDefault();
                                              saveCommentEdit();
                                            }
                                            if (e.key === 'Escape')
                                              setEditingComment(null);
                                          }}
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={saveCommentEdit}
                                            disabled={
                                              !editingComment.body.trim()
                                            }
                                          >
                                            Save
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() =>
                                              setEditingComment(null)
                                            }
                                          >
                                            Cancel
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                        {comment.body}
                                      </p>
                                    )}
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      {new Date(
                                        comment.createdAt,
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  {comment.authorId === user.id &&
                                  editingComment?.id !== comment.id ? (
                                    <div className="flex shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          setEditingComment({
                                            id: comment.id,
                                            body: comment.body,
                                          })
                                        }
                                        aria-label="Edit comment"
                                      >
                                        <Pencil className="size-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          setCommentDeleteTarget(comment)
                                        }
                                        aria-label="Delete comment"
                                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-lg border p-3 text-sm text-muted-foreground">
                            No comments yet.
                          </p>
                        )}
                      </section>
                    </>
                  )}
                </div>
              </div>
              <Separator />
              <DrawerFooter className="md:flex-row md:justify-end">
                {detailMode === 'edit' ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelDetailEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={saveDetailItem}
                      disabled={updateMutation.isPending}
                    >
                      Save changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={requestDeleteFromDetails}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startDetailEdit}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    {detailItem.status !== 'done' ? (
                      <Button
                        type="button"
                        onClick={() => handleStatusChange(detailItem, 'done')}
                      >
                        <CheckCircle2 className="size-4" />
                        Mark done
                      </Button>
                    ) : null}
                  </>
                )}
              </DrawerFooter>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      <ResponsiveModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete work item?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              This removes the item from the database.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={Boolean(commentDeleteTarget)}
        onOpenChange={(open) => !open && setCommentDeleteTarget(null)}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete comment?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              This action cannot be undone.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button variant="outline">Cancel</Button>
            </ResponsiveModalClose>
            <Button variant="destructive" onClick={confirmDeleteComment}>
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <UserProfileDrawer
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onMessage={(id) => navigate(`/chat?peer=${id}`)}
        currentUserId={user?.id}
      />
    </PageShell>
  );
}

function DueDatePicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseDateValue(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className="w-full justify-start px-3 font-normal"
        >
          <CalendarDays className="size-4 text-muted-foreground" />
          {value || <span className="text-muted-foreground">No due date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-auto p-0"
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? formatDateValue(date) : '');
            setOpen(false);
          }}
          captionLayout="dropdown"
        />
        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={!value}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            Clear due date
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function WorkItemsTable({
  items,
  onStatusChange,
  onDone,
  onEdit,
  onDelete,
  onOpenDetails,
}: {
  items: WorkItem[];
  onStatusChange: (item: WorkItem, status: WorkItemStatus) => void;
  onDone: (item: WorkItem) => void;
  onEdit: (item: WorkItem) => void;
  onDelete: (item: WorkItem) => void;
  onOpenDetails: (item: WorkItem) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border">
      <Table className="min-w-[760px] table-fixed">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[24%]" />
          <col className="w-[14%]" />
          <col className="w-[16%]" />
          <col className="w-[12%]" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              onClick={() => onOpenDetails(item)}
            >
              <TableCell>
                <div className="font-medium">{item.title}</div>
                {item.description ? (
                  <div className="truncate text-xs text-muted-foreground">
                    {item.description}
                  </div>
                ) : null}
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Select
                  value={item.status}
                  onValueChange={(value: WorkItemStatus) =>
                    onStatusChange(item, value)
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge
                  variant={item.priority === 'high' ? 'default' : 'secondary'}
                >
                  {priorityLabels[item.priority]}
                </Badge>
              </TableCell>
              <TableCell>{item.dueDate ?? '—'}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {item.status !== 'done' ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDone(item);
                      }}
                      aria-label="Mark done"
                    >
                      <CheckCircle2 className="size-4" />
                    </Button>
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDetails(item);
                        }}
                      >
                        <Eye className="size-4" />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          onEdit(item);
                        }}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(item);
                        }}
                        variant="destructive"
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator />
      <div className="p-3 text-xs text-muted-foreground">
        {items.length} item{items.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}
