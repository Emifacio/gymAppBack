import createClient, { type Client, type HeadersOptions } from "openapi-fetch";

import type { AuthSession, SessionManager } from "./auth";
import type { components, paths } from "./schema";

export const DEFAULT_API_BASE_URL = "https://gymappback-production-7f4e.up.railway.app";

const RETRY_HEADER = "x-gym-platform-retried";

export type GymApiClient = Client<paths>;
export type Workout = components["schemas"]["ClassRead"];
export type WorkoutFilters = NonNullable<paths["/classes"]["get"]["parameters"]["query"]>;
export type WorkoutCreatePayload = components["schemas"]["ClassCreate"];
export type WorkoutUpdatePayload = components["schemas"]["ClassUpdate"];
export type LoginPayload = components["schemas"]["LoginRequest"];
export type RegisterPayload = components["schemas"]["RegisterRequest"];
export type BookingPayload = components["schemas"]["BookingCreate"];
export type BookingAction = components["schemas"]["BookingActionResponse"];
export type BookingCancellation = components["schemas"]["BookingCancellationResponse"];
export type MemberBookings = components["schemas"]["MemberBookingsResponse"];
export type Member = components["schemas"]["MemberRead"];
export type MemberFilters = NonNullable<paths["/members"]["get"]["parameters"]["query"]>;
export type MemberCreatePayload = components["schemas"]["MemberCreate"];
export type MemberUpdatePayload = components["schemas"]["MemberUpdate"];
export type AttendancePayload = components["schemas"]["AttendanceCreate"];
export type AttendanceRecord = components["schemas"]["AttendanceRead"];
export type IntegrationConnectPayload = components["schemas"]["StravaConnectRequest"];
export type IntegrationAccount = components["schemas"]["IntegrationAccountRead"];
export type ActivityRecord = components["schemas"]["ActivityRead"];
export type ActivitySyncPayload = components["schemas"]["ActivitySyncRequest"];
export type ActivitySyncResult = components["schemas"]["TaskEnqueueResponse"];
export type HealthStatus = paths["/health"]["get"]["responses"][200]["content"]["application/json"];

export interface CreateApiClientOptions {
  baseUrl?: string;
  sessionManager?: SessionManager;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersOptions;
  onUnauthorized?: () => Promise<void> | void;
}

export class ApiResponseError<TError = unknown> extends Error {
  readonly status: number;
  readonly payload: TError | string | undefined;
  readonly response: Response;

  constructor(status: number, response: Response, payload?: TError | string) {
    super(`API request failed with status ${status}`);
    this.name = "ApiResponseError";
    this.status = status;
    this.response = response;
    this.payload = payload;
  }
}

function formatBearerToken(session: Pick<AuthSession, "accessToken" | "tokenType">): string {
  return `${session.tokenType ?? "bearer"} ${session.accessToken}`;
}

async function parseErrorPayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.clone().json();
  }

  const text = await response.clone().text();
  return text || undefined;
}

export function createApiClient(options: CreateApiClientOptions = {}): GymApiClient {
  const {
    baseUrl = DEFAULT_API_BASE_URL,
    sessionManager,
    onUnauthorized,
    fetch: providedFetch,
    headers
  } = options;

  const requestFetch = providedFetch ?? ((request: Request) => globalThis.fetch(request));

  const client = createClient<paths>({
    baseUrl,
    ...(headers ? { headers } : {}),
    fetch: async (request) => {
      const response = await requestFetch(request);

      if (
        response.status !== 401 ||
        !sessionManager ||
        request.headers.get(RETRY_HEADER) === "1" ||
        !sessionManager.hasRefreshStrategy()
      ) {
        if (response.status === 401 && sessionManager && !sessionManager.hasRefreshStrategy()) {
          await sessionManager.clearSession();
          await onUnauthorized?.();
        }

        return response;
      }

      const refreshedSession = await sessionManager.refreshSession();
      if (!refreshedSession) {
        await sessionManager.clearSession();
        await onUnauthorized?.();
        return response;
      }

      const retryHeaders = new Headers(request.headers);
      retryHeaders.set("authorization", formatBearerToken(refreshedSession));
      retryHeaders.set(RETRY_HEADER, "1");

      const retryRequest = new Request(request, {
        headers: retryHeaders
      });

      const retriedResponse = await requestFetch(retryRequest);
      if (retriedResponse.status === 401) {
        await sessionManager.clearSession();
        await onUnauthorized?.();
      }

      return retriedResponse;
    }
  });

  client.use({
    onRequest: async ({ request }) => {
      if (!sessionManager || request.headers.has("authorization")) {
        return request;
      }

      const token = await sessionManager.getAccessToken();
      if (!token) {
        return request;
      }

      request.headers.set("authorization", `Bearer ${token}`);
      return request;
    }
  });

  return client;
}

export async function unwrapResult<TData, TError = unknown>(
  request: Promise<{ data?: TData; error?: TError; response: Response }>
): Promise<TData> {
  const result = await request;

  if (result.error !== undefined) {
    throw new ApiResponseError(result.response.status, result.response, result.error);
  }

  if (!result.response.ok) {
    throw new ApiResponseError(
      result.response.status,
      result.response,
      (await parseErrorPayload(result.response)) as TError
    );
  }

  return result.data as TData;
}

export function isApiResponseError(error: unknown): error is ApiResponseError {
  return error instanceof ApiResponseError;
}
