export type BotSession = {
  token: string;
  childId: string;
  childName: string;
  user: { id: string; email: string; displayName: string };
  families: { id: string; name: string; role: string }[];
};

export type ApiEvent = {
  id: string;
  type: string;
  source: string;
  occurredAt: string;
  note?: string | null;
  detailsJson?: Record<string, unknown> | null;
};

export type ApiDraft = {
  id: string;
  type: string;
  confidence: number;
  sourceFragment: string;
  occurredAt?: string | null;
  detailsJson: Record<string, unknown>;
  isConfirmed: boolean;
};

export type ApiRawInput = {
  id: string;
  draftEvents?: ApiDraft[];
};

export type ApiError = {
  error?: {
    message?: string;
    statusCode?: number;
  };
};

export type ApiClientOptions = {
  apiBaseUrl: string;
  botSecret: string;
};

export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  async redeemLink(code: string, telegramUserId: string, telegramChatId?: string) {
    return this.request<BotSession>("/telegram/link", {
      method: "POST",
      body: JSON.stringify({
        code,
        telegramUserId,
        telegramChatId
      })
    });
  }

  async getContext(telegramUserId: string) {
    return this.request<BotSession>("/telegram/context", {
      headers: {
        "x-bot-secret": this.options.botSecret,
        "x-telegram-user-id": telegramUserId
      }
    });
  }

  async createEvent(
    session: BotSession,
    type: string,
    details: Record<string, unknown>,
    note?: string,
    rawInputId?: string
  ) {
    return this.request<ApiEvent>("/events", {
      method: "POST",
      auth: session.token,
      body: JSON.stringify({
        childId: session.childId,
        type,
        source: "telegram",
        occurredAt: new Date().toISOString(),
        details,
        note,
        rawInputId
      })
    });
  }

  async createRawInput(session: BotSession, text: string, telegramChatId?: string) {
    return this.request<ApiRawInput>("/raw-inputs", {
      method: "POST",
      auth: session.token,
      body: JSON.stringify({
        childId: session.childId,
        source: "telegram",
        text,
        telegramChatId
      })
    });
  }

  async getRawInput(session: BotSession, rawInputId: string) {
    return this.request<ApiRawInput>(`/raw-inputs/${rawInputId}`, {
      auth: session.token
    });
  }

  async confirmDraft(session: BotSession, draftId: string) {
    return this.request<ApiEvent>(`/drafts/${draftId}/confirm`, {
      method: "PATCH",
      auth: session.token
    });
  }

  async getDailySummaryText(session: BotSession, date?: string) {
    const params = new URLSearchParams({ format: "text" });
    if (date) {
      params.set("date", date);
    }
    return this.requestText(`/analytics/daily/${session.childId}?${params.toString()}`, {
      auth: session.token
    });
  }

  private async requestText(
    path: string,
    init: RequestInit & { auth?: string } = {}
  ): Promise<{ ok: true; data: string } | { ok: false; message: string }> {
    const headers: Record<string, string> = {
      ...(init.headers as Record<string, string> | undefined)
    };
    if (init.auth) {
      headers.authorization = `Bearer ${init.auth}`;
    }

    try {
      const response = await fetch(`${this.options.apiBaseUrl}${path}`, {
        ...init,
        headers
      });
      const body = await response.text();
      if (!response.ok) {
        try {
          const payload = JSON.parse(body) as ApiError;
          return {
            ok: false,
            message: payload.error?.message ?? `Request failed (${response.status})`
          };
        } catch {
          return {
            ok: false,
            message: body || `Request failed (${response.status})`
          };
        }
      }
      return { ok: true, data: body };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Network error"
      };
    }
  }

  private async request<T>(
    path: string,
    init: RequestInit & { auth?: string } = {}
  ): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(init.headers as Record<string, string> | undefined)
    };
    if (init.auth) {
      headers.authorization = `Bearer ${init.auth}`;
    }

    try {
      const response = await fetch(`${this.options.apiBaseUrl}${path}`, {
        ...init,
        headers
      });
      const payload = (await response.json()) as T & ApiError;
      if (!response.ok) {
        return {
          ok: false,
          message: payload.error?.message ?? `Request failed (${response.status})`
        };
      }
      return { ok: true, data: payload as T };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Network error"
      };
    }
  }
}
