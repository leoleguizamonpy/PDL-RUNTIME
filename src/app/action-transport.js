function queryString(payload = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload || {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const value = params.toString();
  return value ? "?" + value : "";
}

export function createHttpActionTransport(actions, options = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? "";
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");

  return {
    async invoke(actionId, payload = undefined) {
      const contract = actions[actionId];
      if (!contract) throw new Error("Unknown product action: " + actionId);
      const method = contract.method || "POST";
      const url = baseUrl + contract.path + (method === "GET" ? queryString(payload) : "");
      const init = {
        method,
        credentials: "same-origin",
        headers: { "Accept": "application/json", ...(options.headers || {}) }
      };
      if (payload !== undefined && method !== "GET") {
        init.headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(payload);
      }
      const response = await fetchImpl(url, init);
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body?.error?.message || body?.message || "Product action failed";
        const error = new Error(message);
        error.status = response.status;
        error.payload = body;
        throw error;
      }
      return body?.data ?? body;
    }
  };
}
