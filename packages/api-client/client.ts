import createClient, { type Client, type FetchResponse, type HeadersOptions } from "openapi-fetch";

import type { AuthSession, SessionManager } from "./auth";
import type { components, paths } from "./schema";

export const DEFAULT_API_BASE_URL = "https://gymappback-production-7f4e.up.railway.app";

const RETRY_HEADER = "x-gym-platform-retried";

export type GymApiClient = Client<paths>;
export interface Plan {
  id: string;
  name: string;
  description?: string | null;
  credits_per_period: number;
  period_type: "weekly" | "monthly";
  allows_free_pass: boolean;
  active: boolean;
  created_at: string;
}

export interface PlanCreatePayload {
  name: string;
  description?: string | null;
  credits_per_period: number;
  period_type: "weekly" | "monthly";
  allows_free_pass?: boolean;
  active?: boolean;
}

export interface PlanUpdatePayload {
  name?: string | null;
  description?: string | null;
  credits_per_period?: number | null;
  period_type?: "weekly" | "monthly" | null;
  allows_free_pass?: boolean | null;
  active?: boolean | null;
}

export interface MemberSubscription {
  id: string;
  member_id: string;
  plan_id: string;
  active_credits: number;
  period_start: string;
  period_end: string;
  status: "active" | "expired" | "cancelled";
  created_at: string;
  plan: Plan;
}

export type BookingEligibilityErrorCode =
  | "NO_ACTIVE_PLAN"
  | "PLAN_EXPIRED"
  | "INSUFFICIENT_CREDITS"
  | "CLASS_FULL"
  | "DUPLICATE_BOOKING"
  | "BOOKING_NOT_ALLOWED";

export type BookingActionState = "BOOKING_CONFIRMED" | "ADDED_TO_WAITLIST";

export interface MemberSubscriptionStatus {
  active_plan: boolean;
  active_credits: number;
  period_end?: string | null;
  plan_name?: string | null;
  allows_free_pass: boolean;
  status?: "active" | "expired" | "cancelled" | null;
  error_code?: BookingEligibilityErrorCode | string | null;
}

export interface ApiErrorPayload {
  detail?: unknown;
  message?: string;
  code?: string;
  error_code?: string;
}

export interface SubscriptionAssignPayload {
  plan_id: string;
}

export interface ClassMember {
  booking_id: string;
  member_id: string;
  full_name: string;
  email: string;
  booked_at: string;
  booking_type: "credit" | "free_pass" | "waitlist";
  credits_consumed: number;
  assigned_by_admin?: boolean;
  assigned_by_user_id?: string | null;
  assigned_at?: string | null;
}

export interface ClassAssignmentPayload {
  member_id: string;
}

export type Workout = components["schemas"]["ClassRead"] & {
  available_spots?: number | null;
  waitlist_size?: number;
  member_booking_status?: string | null;
};
export type WorkoutFilters = NonNullable<paths["/classes"]["get"]["parameters"]["query"]>;
export type WorkoutCreatePayload = components["schemas"]["ClassCreate"];
export type WorkoutUpdatePayload = components["schemas"]["ClassUpdate"];
export type LoginPayload = components["schemas"]["LoginRequest"];
export type GoogleLoginPayload = components["schemas"]["GoogleLoginRequest"];
export type RegisterPayload = components["schemas"]["RegisterRequest"];
export type BookingPayload = components["schemas"]["BookingCreate"];
export type BookingRecord = components["schemas"]["BookingRead"] & {
  subscription_id?: string | null;
  booking_type: "credit" | "free_pass" | "waitlist";
  credits_consumed: number;
  assigned_by_admin?: boolean;
  assigned_by_user_id?: string | null;
  assigned_at?: string | null;
  gym_class?: Workout | null;
};
export type WaitlistEntry = components["schemas"]["WaitlistRead"] & {
  gym_class?: Workout | null;
};
export type BookingAction = Omit<
  components["schemas"]["BookingActionResponse"],
  "state" | "booking" | "waitlist_entry"
> & {
  state: BookingActionState;
  booking?: BookingRecord | null;
  waitlist_entry?: WaitlistEntry | null;
};
export type BookingCancellation = components["schemas"]["BookingCancellationResponse"] & {
  status: "cancelled";
  credit_restored: boolean;
  promoted_booking?: BookingRecord | null;
};
export interface MemberBookings {
  bookings: BookingRecord[];
  waitlist: WaitlistEntry[];
}
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
export interface AvatarUploadResponse {
  url: string;
}
export type HealthStatus = paths["/health"]["get"]["responses"][200]["content"]["application/json"];

export interface CreateApiClientOptions {
  baseUrl?: string;
  sessionManager?: SessionManager;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersOptions;
  onUnauthorized?: () => Promise<void> | void;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return typeof value === "object" && value !== null;
}

function extractApiErrorMessage(status: number, payload?: ApiErrorPayload | string | any): string {
  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (isApiErrorPayload(payload)) {
    // Format validation errors (422) specifically for better visibility
    if (status === 422 && Array.isArray(payload.detail)) {
      const details = payload.detail
        .map((err: any) => {
          const loc = Array.isArray(err.loc) ? err.loc.join(".") : "unknown";
          return `${loc}: ${err.msg}`;
        })
        .join(", ");
      return `Validation failed: ${details}`;
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail;
    }
  }

  return `API request failed with status ${status}`;
}

export class ApiResponseError<TError = unknown> extends Error {
  readonly status: number;
  readonly payload: TError | string | undefined;
  readonly response: Response;

  constructor(status: number, response: Response, payload?: TError | string) {
    super(extractApiErrorMessage(status, payload));
    this.name = "ApiResponseError";
    this.status = status;
    this.response = response;
    this.payload = payload;
  }
}

function formatBearerToken(session: Pick<AuthSession, "accessToken" | "tokenType">): string {
  return `${session.tokenType ?? "bearer"} ${session.accessToken}`;
}

function dispatchApiEvent(name: string, detail: Record<string, unknown>) {
  const target = globalThis as unknown as { dispatchEvent?: (event: Event) => boolean };

  if (typeof target.dispatchEvent === "function") {
    target.dispatchEvent(new CustomEvent(name, { detail }));
  }
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

      if (response.status === 403) {
        dispatchApiEvent("gym:api-forbidden", { status: 403 });
      }

      if (response.status === 500) {
        dispatchApiEvent("gym:api-server-error", { status: 500 });
      }

      if (
        response.status !== 401 ||
        !sessionManager ||
        request.headers.get(RETRY_HEADER) === "1" ||
        !sessionManager.hasRefreshStrategy()
      ) {
        if (response.status === 401 && sessionManager && !sessionManager.hasRefreshStrategy()) {
          await sessionManager.clearSession();
          dispatchApiEvent("gym:api-unauthorized", { status: 401 });
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
  request: Promise<
    | { data?: TData; error?: TError; response: Response }
    | FetchResponse<Record<string, any>, any, any>
  >
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

export function getApiErrorPayload(error: unknown): ApiErrorPayload | null {
  if (!isApiResponseError(error) || !isApiErrorPayload(error.payload)) {
    return null;
  }

  return error.payload;
}

export function getApiErrorCode(error: unknown): string | undefined {
  const payload = getApiErrorPayload(error);

  if (!payload) {
    return undefined;
  }

  return payload.error_code ?? payload.code;
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong while contacting the API.";
}
