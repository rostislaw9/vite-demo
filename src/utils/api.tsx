import { send } from './request';

export interface UpdateUserInfoPayload {
  displayName: string;
  avatarUrl?: string | null;
  bio?: string;
  title?: string;
  company?: string;
  location?: string;
}

export type WorkItemStatus = 'todo' | 'in_progress' | 'done';
export type WorkItemPriority = 'low' | 'medium' | 'high';

export type ActivityType =
  | 'comment_created'
  | 'comment_deleted'
  | 'organization_created'
  | 'organization_updated'
  | 'organization_deleted'
  | 'organization_member_added'
  | 'work_item_created'
  | 'work_item_updated'
  | 'work_item_deleted'
  | 'work_item_status_changed'
  | 'profile_updated'
  | 'user_login';

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  workItemId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkItem {
  id: string;
  ownerId: string;
  organizationId?: string;
  assigneeId?: string;
  assignee?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type OrganizationRole = 'owner' | 'admin' | 'member';

export interface WorkItemComment {
  id: string;
  workItemId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  members?: OrganizationMember[];
}

export interface WorkItemPayload {
  title: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: WorkItemPriority;
  dueDate?: string | null;
  assigneeId?: string | null;
}

export interface AdminUserStats {
  user: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    roles: string[];
    createdAt: string;
  };
  workItemCount: number;
  completedCount: number;
}

export const getOrCreateUser = async (
  email: string,
  firebaseUID: string,
  token: string,
  displayName: string | null,
) => {
  return send({
    method: 'POST',
    url: '/users/get-or-create',
    body: { email, firebaseUID, displayName },
    headers: { Authorization: `Bearer ${token}` },
    withAuth: false,
  });
};

export const getUserInfo = async (userId: string) => {
  return send({
    method: 'GET',
    url: `/users/${userId}`,
    withAuth: true,
  });
};

export const updateUserInfo = async (
  userId: string,
  payload: UpdateUserInfoPayload,
) => {
  const body = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );

  return send({
    method: 'PATCH',
    url: `/users/${userId}`,
    body,
    withAuth: true,
  });
};

export const getHealth = async () => {
  return send({
    method: 'GET',
    url: '/health',
    withAuth: false,
  });
};

export const getAdminUserStats = async () => {
  return send({
    method: 'GET',
    url: '/users/admin/stats',
    withAuth: true,
  });
};

export const getWorkItems = async (userId: string, organizationId?: string) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'GET',
    url: `/users/${userId}/work-items${qs}`,
    withAuth: true,
  });
};

export const createWorkItem = async (
  userId: string,
  payload: WorkItemPayload,
  organizationId?: string,
) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'POST',
    url: `/users/${userId}/work-items${qs}`,
    body: payload,
    withAuth: true,
  });
};

export const updateWorkItem = async (
  userId: string,
  workItemId: string,
  payload: Partial<WorkItemPayload>,
  organizationId?: string,
) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'PATCH',
    url: `/users/${userId}/work-items/${workItemId}${qs}`,
    body: payload,
    withAuth: true,
  });
};

export const reorderWorkItems = async (
  userId: string,
  items: { id: string; position: number }[],
  organizationId?: string,
) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'POST',
    url: `/users/${userId}/work-items/reorder${qs}`,
    body: { items },
    withAuth: true,
  });
};

export const deleteWorkItem = async (
  userId: string,
  workItemId: string,
  organizationId?: string,
) => {
  const qs = organizationId ? `?organizationId=${organizationId}` : '';
  return send({
    method: 'DELETE',
    url: `/users/${userId}/work-items/${workItemId}${qs}`,
    withAuth: true,
  });
};

export const getWorkItemComments = async (
  userId: string,
  workItemId: string,
) => {
  return send({
    method: 'GET',
    url: `/users/${userId}/work-items/${workItemId}/comments`,
    withAuth: true,
  });
};

export const createWorkItemComment = async (
  userId: string,
  workItemId: string,
  body: string,
) => {
  return send({
    method: 'POST',
    url: `/users/${userId}/work-items/${workItemId}/comments`,
    body: { body },
    withAuth: true,
  });
};

export const updateWorkItemComment = async (
  userId: string,
  workItemId: string,
  commentId: string,
  body: string,
) => {
  return send({
    method: 'PATCH',
    url: `/users/${userId}/work-items/${workItemId}/comments/${commentId}`,
    body: { body },
    withAuth: true,
  });
};

export const deleteWorkItemComment = async (
  userId: string,
  workItemId: string,
  commentId: string,
) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/work-items/${workItemId}/comments/${commentId}`,
    withAuth: true,
  });
};

export const getOrganizations = async (userId: string) => {
  return send({
    method: 'GET',
    url: `/users/${userId}/organizations`,
    withAuth: true,
  });
};

export const createOrganization = async (
  userId: string,
  payload: { name: string; description?: string },
) => {
  return send({
    method: 'POST',
    url: `/users/${userId}/organizations`,
    body: payload,
    withAuth: true,
  });
};

export const updateOrganization = async (
  userId: string,
  organizationId: string,
  payload: { name?: string; description?: string },
) => {
  return send({
    method: 'PATCH',
    url: `/users/${userId}/organizations/${organizationId}`,
    body: payload,
    withAuth: true,
  });
};

export const deleteOrganization = async (
  userId: string,
  organizationId: string,
) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/organizations/${organizationId}`,
    withAuth: true,
  });
};

export const getOrganizationMembers = async (
  userId: string,
  organizationId: string,
) => {
  return send({
    method: 'GET',
    url: `/users/${userId}/organizations/${organizationId}/members`,
    withAuth: true,
  });
};

export const addOrganizationMember = async (
  userId: string,
  organizationId: string,
  payload: { email: string; role?: OrganizationRole },
) => {
  return send({
    method: 'POST',
    url: `/users/${userId}/organizations/${organizationId}/members`,
    body: payload,
    withAuth: true,
  });
};

export const updateOrganizationMember = async (
  userId: string,
  organizationId: string,
  memberId: string,
  role: OrganizationRole,
) => {
  return send({
    method: 'PATCH',
    url: `/users/${userId}/organizations/${organizationId}/members/${memberId}`,
    body: { role },
    withAuth: true,
  });
};

export const removeOrganizationMember = async (
  userId: string,
  organizationId: string,
  memberId: string,
) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/organizations/${organizationId}/members/${memberId}`,
    withAuth: true,
  });
};

export const searchUsers = async (q: string, callerId?: string) => {
  const params = new URLSearchParams({ q });
  if (callerId) params.set('callerId', callerId);
  return send({
    method: 'GET',
    url: `/users/search?${params.toString()}`,
    withAuth: true,
  });
};

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  read: boolean;
  edited: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  recipient?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export interface DmConversation {
  peer: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  lastMessage: DirectMessage | null;
  unreadCount: number;
}

export const getDmConversations = async (userId: string) => {
  return send({
    method: 'GET',
    url: `/users/${userId}/messages/conversations`,
    withAuth: true,
  });
};

export const getDmMessages = async (
  userId: string,
  peerId: string,
  limit = 50,
  before?: string,
) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  return send({
    method: 'GET',
    url: `/users/${userId}/messages/${peerId}?${params.toString()}`,
    withAuth: true,
  });
};

export const sendDmMessage = async (
  userId: string,
  recipientId: string,
  body: string,
) => {
  return send({
    method: 'POST',
    url: `/users/${userId}/messages`,
    body: { recipientId, body },
    withAuth: true,
  });
};

export const markDmRead = async (userId: string, peerId: string) => {
  return send({
    method: 'POST',
    url: `/users/${userId}/messages/${peerId}/read`,
    withAuth: true,
  });
};

export const deleteDmConversation = async (userId: string, peerId: string) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/messages/${peerId}`,
    withAuth: true,
  });
};

export const editDmMessage = async (
  userId: string,
  peerId: string,
  messageId: string,
  body: string,
) => {
  return send({
    method: 'PATCH',
    url: `/users/${userId}/messages/${peerId}/${messageId}`,
    body: { body },
    withAuth: true,
  });
};

export const deleteDmMessage = async (
  userId: string,
  peerId: string,
  messageId: string,
) => {
  return send({
    method: 'DELETE',
    url: `/users/${userId}/messages/${peerId}/${messageId}`,
    withAuth: true,
  });
};

export const getActivities = async (
  userId: string,
  limit = 20,
  organizationId?: string,
) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (organizationId) params.set('organizationId', organizationId);
  return send({
    method: 'GET',
    url: `/users/${userId}/activities?${params.toString()}`,
    withAuth: true,
  });
};
