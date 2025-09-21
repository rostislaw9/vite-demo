import {
  Building2,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserMinus2,
  Users,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import LoadingSpinner from '@/components/LoadingSpinner';
import PageShell from '@/components/PageShell';
import UserAvatar from '@/components/UserAvatar';
import UserProfileDrawer from '@/components/UserProfileDrawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import {
  ResponsiveModal,
  ResponsiveModalClose,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from '@/components/ui/responsive-modal';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  addOrganizationMember,
  createOrganization,
  deleteOrganization,
  getOrganizationMembers,
  getOrganizations,
  removeOrganizationMember,
  searchUsers,
  updateOrganization,
  updateOrganizationMember,
  type Organization,
  type OrganizationMember,
  type OrganizationRole,
} from '@/utils/api';

const roleLabels: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export default function OrganizationsPage() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [removeMemberTarget, setRemoveMemberTarget] =
    useState<OrganizationMember | null>(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('member');
  const [searchResults, setSearchResults] = useState<
    { id: string; email: string; displayName?: string; avatarUrl?: string }[]
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string;
    displayName?: string;
  } | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedId),
    [organizations, selectedId],
  );

  const handleSearchChange = (value: string) => {
    setInviteQuery(value);
    setSelectedUser(null);
    setSearchOpen(value.length >= 2);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (value.length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await searchUsers(value);
        const users = res.data.data ?? res.data ?? [];
        const memberUserIds = new Set(members.map((m) => m.userId));
        setSearchResults(
          users.filter((u: { id: string }) => !memberUserIds.has(u.id)),
        );
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  };

  const handleSelectUser = (u: {
    id: string;
    email: string;
    displayName?: string;
  }) => {
    setSelectedUser(u);
    setInviteQuery(u.email);
    setSearchOpen(false);
  };

  const getCurrentRole = (organization: Organization) =>
    organization.ownerId === user?.id
      ? 'owner'
      : organization.members?.find((member) => member.userId === user?.id)
          ?.role;

  const canManageOrganization = (organization: Organization) => {
    const role = getCurrentRole(organization);
    return role === 'owner' || role === 'admin';
  };

  const canDeleteOrganization = (organization: Organization) =>
    getCurrentRole(organization) === 'owner';

  const loadOrganizations = () => {
    if (!user) return;

    setLoading(true);
    getOrganizations(user.id)
      .then((res) => {
        const data = res.data.data ?? res.data ?? [];
        setOrganizations(data);
        setSelectedId((current) => current ?? data[0]?.id ?? null);
      })
      .catch(() => toast.error('Could not load organizations'))
      .finally(() => setLoading(false));
  };

  const loadMembers = (organizationId: string) => {
    if (!user) return;

    getOrganizationMembers(user.id, organizationId)
      .then((res) => setMembers(res.data.data ?? res.data ?? []))
      .catch(() => {
        setMembers([]);
        toast.error('Could not load organization members');
      });
  };

  useEffect(() => {
    loadOrganizations();
  }, [user?.id]);

  useEffect(() => {
    if (selectedId) loadMembers(selectedId);
  }, [selectedId, user?.id]);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !orgForm.name.trim()) return;

    setCreating(true);
    try {
      const res = await createOrganization(user.id, {
        name: orgForm.name.trim(),
        description: orgForm.description.trim() || undefined,
      });
      const created = res.data.data ?? res.data;
      setOrganizations((current) => [created, ...current]);
      setSelectedId(created.id);
      setOrgForm({ name: '', description: '' });
      setCreateOpen(false);
      toast.success('Organization created');
    } catch {
      toast.error('Could not create organization');
    } finally {
      setCreating(false);
    }
  };

  const openEditOrganization = (organization: Organization) => {
    setEditingOrganization(organization);
    setEditForm({
      name: organization.name,
      description: organization.description ?? '',
    });
    setEditOpen(true);
  };

  const handleUpdate = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !editingOrganization || !editForm.name.trim()) return;

    setUpdating(true);
    try {
      const res = await updateOrganization(user.id, editingOrganization.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      });
      const updated = res.data.data ?? res.data;
      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === updated.id ? updated : organization,
        ),
      );
      setEditingOrganization(null);
      setEditForm({ name: '', description: '' });
      setEditOpen(false);
      toast.success('Organization updated');
    } catch {
      toast.error('Could not update organization');
    } finally {
      setUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (!user || !deleteTarget) return;

    setDeleting(true);
    try {
      await deleteOrganization(user.id, deleteTarget.id);
      const nextOrganizations = organizations.filter(
        (organization) => organization.id !== deleteTarget.id,
      );
      setOrganizations(nextOrganizations);
      setSelectedId((current) =>
        current === deleteTarget.id
          ? (nextOrganizations[0]?.id ?? null)
          : current,
      );
      if (!nextOrganizations.length) setMembers([]);
      setDeleteTarget(null);
      toast.success('Organization deleted');
    } catch {
      toast.error('Could not delete organization');
    } finally {
      setDeleting(false);
    }
  };

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !selectedOrganization || !selectedUser) return;

    setInviting(true);
    try {
      const res = await addOrganizationMember(
        user.id,
        selectedOrganization.id,
        { email: selectedUser.email, role: inviteRole },
      );
      setMembers((current) => [...current, res.data.data ?? res.data]);
      setInviteQuery('');
      setInviteRole('member');
      setSelectedUser(null);
      setSearchResults([]);
      toast.success('Member added');
    } catch (err: unknown) {
      const msg = (
        err as { response?: { data?: { error?: { message?: string } } } }
      )?.response?.data?.error?.message;
      toast.error(msg ?? 'Could not add member');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (
    member: OrganizationMember,
    role: OrganizationRole,
  ) => {
    if (!user || !selectedOrganization) return;
    try {
      const res = await updateOrganizationMember(
        user.id,
        selectedOrganization.id,
        member.id,
        role,
      );
      const updated = res.data.data ?? res.data;
      setMembers((current) =>
        current.map((m) =>
          m.id === member.id ? { ...m, role: updated.role } : m,
        ),
      );
      toast.success('Role updated');
    } catch {
      toast.error('Could not update role');
    }
  };

  const confirmRemoveMember = async () => {
    if (!user || !selectedOrganization || !removeMemberTarget) return;
    setRemovingMember(true);
    try {
      await removeOrganizationMember(
        user.id,
        selectedOrganization.id,
        removeMemberTarget.id,
      );
      setMembers((current) =>
        current.filter((m) => m.id !== removeMemberTarget.id),
      );
      setRemoveMemberTarget(null);
      toast.success('Member removed');
    } catch {
      toast.error('Could not remove member');
    } finally {
      setRemovingMember(false);
    }
  };

  if (!user) return null;

  return (
    <PageShell
      title="Organizations"
      description="Model multi-tenant access, team membership, and scoped collaboration."
      actions={
        <ResponsiveModal open={createOpen} onOpenChange={setCreateOpen}>
          <ResponsiveModalTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New organization
            </Button>
          </ResponsiveModalTrigger>
          <ResponsiveModalContent showCloseButton={false}>
            <form onSubmit={handleCreate} className="space-y-4">
              <ResponsiveModalHeader className="border-b md:border-0">
                <ResponsiveModalTitle className="text-xl">
                  Create organization
                </ResponsiveModalTitle>
                <ResponsiveModalDescription>
                  Set up a new workspace for your team.
                </ResponsiveModalDescription>
              </ResponsiveModalHeader>
              <div className="space-y-4 p-4 md:p-0">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input
                    id="org-name"
                    value={orgForm.name}
                    onChange={(event) =>
                      setOrgForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-description">Description</Label>
                  <Textarea
                    id="org-description"
                    value={orgForm.description}
                    onChange={(event) =>
                      setOrgForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <ResponsiveModalFooter className="border-t md:border-t">
                <ResponsiveModalClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </ResponsiveModalClose>
                <Button type="submit" disabled={creating}>
                  Create
                </Button>
              </ResponsiveModalFooter>
            </form>
          </ResponsiveModalContent>
        </ResponsiveModal>
      }
    >
      {loading ? (
        <LoadingSpinner />
      ) : organizations.length ? (
        <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4" />
                Workspaces
              </CardTitle>
            </CardHeader>
            <CardContent className="pr-1">
              <ScrollArea className="pr-3 [&>[data-slot=scroll-area-viewport]]:max-h-64 lg:[&>[data-slot=scroll-area-viewport]]:max-h-[calc(100vh-16rem)]">
                <ItemGroup>
                  {organizations.map((organization) => {
                    const canManage = canManageOrganization(organization);
                    const canDelete = canDeleteOrganization(organization);

                    const isSelected = selectedId === organization.id;

                    return (
                      <Item
                        key={organization.id}
                        variant={isSelected ? 'muted' : 'outline'}
                        className={`cursor-pointer items-start hover:border-neutral-400 ${isSelected ? 'border-neutral-400' : ''}`}
                        onClick={() => setSelectedId(organization.id)}
                      >
                        <ItemContent>
                          <ItemTitle>{organization.name}</ItemTitle>
                          <ItemDescription>
                            {organization.description || 'No description yet.'}
                          </ItemDescription>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <Badge variant="secondary">
                              {organization.members?.length ?? 1} member
                              {(organization.members?.length ?? 1) === 1
                                ? ''
                                : 's'}
                            </Badge>
                            <Badge variant="outline">
                              {
                                roleLabels[
                                  getCurrentRole(organization) ?? 'member'
                                ]
                              }
                            </Badge>
                          </div>
                        </ItemContent>
                        {canManage || canDelete ? (
                          <ItemActions onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canManage ? (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      openEditOrganization(organization)
                                    }
                                  >
                                    <Pencil />
                                    Edit
                                  </DropdownMenuItem>
                                ) : null}
                                {canDelete ? (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    onClick={() =>
                                      setDeleteTarget(organization)
                                    }
                                  >
                                    <Trash2 />
                                    Delete
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </ItemActions>
                        ) : null}
                      </Item>
                    );
                  })}
                </ItemGroup>
              </ScrollArea>
            </CardContent>
          </Card>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="size-4" />
                    Members
                  </span>
                  {selectedOrganization ? (
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">
                        {selectedOrganization.name}
                      </Badge>
                      {canManageOrganization(selectedOrganization) ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            openEditOrganization(selectedOrganization)
                          }
                          aria-label="Edit organization"
                        >
                          <Pencil />
                        </Button>
                      ) : null}
                      {canDeleteOrganization(selectedOrganization) ? (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => setDeleteTarget(selectedOrganization)}
                          aria-label="Delete organization"
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="pr-1">
                {selectedOrganization &&
                canManageOrganization(selectedOrganization) ? (
                  <form onSubmit={handleInvite} className="mb-4 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder="Search by email…"
                          value={inviteQuery}
                          autoComplete="off"
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onFocus={() =>
                            inviteQuery.length >= 2 && setSearchOpen(true)
                          }
                          onBlur={() =>
                            setTimeout(() => setSearchOpen(false), 150)
                          }
                        />
                        {searchOpen && (
                          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                            {searchLoading ? (
                              <Item>
                                <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                <ItemContent>
                                  <ItemDescription>Searching…</ItemDescription>
                                </ItemContent>
                              </Item>
                            ) : searchResults.length ? (
                              searchResults.map((u) => (
                                <Item
                                  key={u.id}
                                  className="cursor-pointer hover:bg-accent"
                                  onMouseDown={() => handleSelectUser(u)}
                                >
                                  <ItemMedia variant="image">
                                    <UserAvatar
                                      src={u.avatarUrl}
                                      name={u.displayName ?? u.email}
                                    />
                                  </ItemMedia>
                                  <ItemContent>
                                    {u.displayName && (
                                      <ItemTitle>{u.displayName}</ItemTitle>
                                    )}
                                    <ItemDescription>{u.email}</ItemDescription>
                                  </ItemContent>
                                </Item>
                              ))
                            ) : (
                              <Item>
                                <ItemContent>
                                  <ItemDescription>
                                    No users found
                                  </ItemDescription>
                                </ItemContent>
                              </Item>
                            )}
                          </div>
                        )}
                      </div>
                      <Select
                        value={inviteRole}
                        onValueChange={(v: OrganizationRole) =>
                          setInviteRole(v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(roleLabels)
                            .filter(([v]) => v !== 'owner')
                            .map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="submit"
                        disabled={inviting || !selectedUser}
                      >
                        <Plus />
                        Add
                      </Button>
                    </div>
                  </form>
                ) : null}

                <ScrollArea className="pr-3 lg:[&>[data-slot=scroll-area-viewport]]:max-h-[calc(100vh-20rem)]">
                  <ItemGroup>
                    {members.map((member) => {
                      const displayName =
                        member.user?.displayName ??
                        member.user?.email ??
                        'User';

                      return (
                        <Item key={member.id} variant="outline">
                          <ItemMedia
                            variant="image"
                            className="cursor-pointer"
                            onClick={() =>
                              member.userId && setProfileUserId(member.userId)
                            }
                            aria-label="View profile"
                          >
                            <UserAvatar
                              src={member.user?.avatarUrl}
                              name={displayName}
                            />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{displayName}</ItemTitle>
                            <ItemDescription>
                              {member.user?.email ?? member.userId}
                            </ItemDescription>
                          </ItemContent>
                          <ItemActions>
                            {selectedOrganization &&
                            canManageOrganization(selectedOrganization) &&
                            member.role !== 'owner' ? (
                              <>
                                <Select
                                  value={member.role}
                                  onValueChange={(v: OrganizationRole) =>
                                    handleRoleChange(member, v)
                                  }
                                >
                                  <SelectTrigger size="sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(roleLabels)
                                      .filter(([v]) => v !== 'owner')
                                      .map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                          {label}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="destructive"
                                  size="icon-sm"
                                  onClick={() => setRemoveMemberTarget(member)}
                                  aria-label="Remove member"
                                >
                                  <UserMinus2 />
                                </Button>
                              </>
                            ) : (
                              <Badge
                                variant={
                                  member.role === 'owner'
                                    ? 'default'
                                    : 'secondary'
                                }
                              >
                                {roleLabels[member.role]}
                              </Badge>
                            )}
                          </ItemActions>
                        </Item>
                      );
                    })}
                  </ItemGroup>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>Create your first organization</EmptyTitle>
            <EmptyDescription>
              Organizations demonstrate multi-tenant ownership, membership
              roles, and scoped collaboration.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus />
              New organization
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <ResponsiveModal
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setEditingOrganization(null);
            setEditForm({ name: '', description: '' });
          }
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <ResponsiveModalHeader className="border-b md:border-0">
              <ResponsiveModalTitle className="text-xl">
                Edit organization
              </ResponsiveModalTitle>
              <ResponsiveModalDescription>
                Rename the workspace or refresh the short description shown to
                members.
              </ResponsiveModalDescription>
            </ResponsiveModalHeader>
            <div className="space-y-4 p-4 md:p-0">
              <div className="space-y-2">
                <Label htmlFor="edit-org-name">Name</Label>
                <Input
                  id="edit-org-name"
                  value={editForm.name}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-org-description">Description</Label>
                <Textarea
                  id="edit-org-description"
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <ResponsiveModalFooter className="border-t md:border-t">
              <ResponsiveModalClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </ResponsiveModalClose>
              <Button type="submit" disabled={updating}>
                Save changes
              </Button>
            </ResponsiveModalFooter>
          </form>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Delete organization?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              This removes the organization and its memberships. Existing users
              will keep their accounts.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveModalClose>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              Delete
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>

      <ResponsiveModal
        open={Boolean(removeMemberTarget)}
        onOpenChange={(open) => {
          if (!open) setRemoveMemberTarget(null);
        }}
      >
        <ResponsiveModalContent showCloseButton={false}>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>Remove member?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              {removeMemberTarget
                ? `Remove ${removeMemberTarget.user?.displayName ?? removeMemberTarget.user?.email ?? 'this user'} from the organization?`
                : ''}
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <ResponsiveModalClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </ResponsiveModalClose>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmRemoveMember}
              disabled={removingMember}
            >
              Remove
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
