const FIGMA_BASE_URL = process.env.FIGMA_API_BASE_URL ?? "https://api.figma.com/v1";

export class FigmaClient {
  constructor(private pat: string) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${FIGMA_BASE_URL}${path}`, {
      ...options,
      headers: {
        "X-Figma-Token": this.pat,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Figma API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  async getVariables(fileKey: string) {
    return this.request(`/files/${fileKey}/variables/local`);
  }

  async pushVariables(fileKey: string, payload: unknown) {
    return this.request(`/files/${fileKey}/variables`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}
