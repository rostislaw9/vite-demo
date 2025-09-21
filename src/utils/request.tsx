import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import { isInAppBrowser } from './is-in-app-browser';

interface IRequestProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: Record<string, any>;
  timeout?: number;
  withAuth?: boolean;
}

/**
 * send() - A generic function to make API requests to the backend.
 * @param {RequestProps} config - Configuration for the request.
 * @returns {Promise<AxiosResponse<any>>} - The response from the backend.
 */
export const send = async (
  config: IRequestProps,
  attempt = 1,
): Promise<AxiosResponse<any>> => {
  const {
    method,
    url,
    headers = {},
    query = {},
    body = {},
    timeout = 5000,
    withAuth = true,
  } = config;

  const authHeaders: Record<string, string> = {};
  if (withAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...authHeaders,
    ...headers,
  };

  try {
    const axiosConfig: AxiosRequestConfig = {
      method,
      url: `${import.meta.env.VITE_API_BASE_URL ?? '/api'}${url}`,
      headers: finalHeaders,
      params: query,
      data: body,
      timeout,
    };

    const response = await axios(axiosConfig);
    return response;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && attempt === 1 && isInAppBrowser()) {
        await new Promise((res) => setTimeout(res, 500));
        return send(config, attempt + 1);
      }

      console.error('Axios Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    } else {
      console.error('Non-Axios Error:', error);
    }

    throw error;
  }
};
