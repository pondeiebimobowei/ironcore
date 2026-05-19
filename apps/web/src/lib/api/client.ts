import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, setAccessToken } from "../auth/token-store";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  withCredentials: true,
});

let refreshRequest: Promise<string | null> | null = null;

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/api/auth/refresh")
    ) {
      throw error;
    }

    originalRequest._retry = true;
    refreshRequest ??= apiClient
      .post<{ accessToken: string }>("/api/auth/refresh")
      .then((response) => {
        setAccessToken(response.data.accessToken);
        return response.data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshRequest = null;
      });

    const refreshedToken = await refreshRequest;

    if (!refreshedToken) {
      throw error;
    }

    originalRequest.headers.set("Authorization", `Bearer ${refreshedToken}`);

    return apiClient(originalRequest);
  },
);
