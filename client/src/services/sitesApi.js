const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Request failed with status ${response.status}`
    );
  }

  return result;
}

export async function getSites() {
  const result = await apiRequest("/api/sites");

  if (!Array.isArray(result.data)) {
    throw new Error("Invalid sites API response");
  }

  return result.data;
}

export async function getCustomers() {
  const result = await apiRequest("/api/customers");

  if (!Array.isArray(result.data)) {
    throw new Error("Invalid customers API response");
  }

  return result.data;
}

export async function createSite(siteData) {
  const result = await apiRequest("/api/sites", {
    method: "POST",
    body: JSON.stringify(siteData),
  });

  return result.data;
}

export async function replaceSite(id, siteData) {
  const result = await apiRequest(`/api/sites/${id}`, {
    method: "PUT",
    body: JSON.stringify(siteData),
  });

  return result.data;
}

export async function patchSite(id, updates) {
  const result = await apiRequest(`/api/sites/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

  return result.data;
}

export async function deleteSite(id) {
  return apiRequest(`/api/sites/${id}`, {
    method: "DELETE",
  });
}