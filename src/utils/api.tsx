import { send } from './request';

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

export const updateUserInfo = async (userId: string, displayName: string) => {
  return send({
    method: 'PATCH',
    url: `/users/${userId}`,
    body: { displayName },
    withAuth: true,
  });
};
