
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

// Sites
export async function getSites() {
  const result = await apiRequest("/api/sites");
  if (!Array.isArray(result.data)) {
    throw new Error("Invalid sites API response");
  }
  return result.data;
}

export async function createSite(data) {
  return (await apiRequest("/api/sites", {
    method: "POST",
    body: JSON.stringify(data),
  })).data;
}

export async function replaceSite(id, data) {
  return (await apiRequest(`/api/sites/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })).data;
}

export async function patchSite(id, data) {
  return (await apiRequest(`/api/sites/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })).data;
}

export async function deleteSite(id) {
  return apiRequest(`/api/sites/${id}`, { method: "DELETE" });
}

// Customers
export async function getCustomers() {
  const result = await apiRequest("/api/customers");
  if (!Array.isArray(result.data)) {
    throw new Error("Invalid customers API response");
  }
  return result.data;
}

export async function createCustomer(data) {
  return (await apiRequest("/api/customers", {
    method: "POST",
    body: JSON.stringify(data),
  })).data;
}

export async function replaceCustomer(id, data) {
  return (await apiRequest(`/api/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })).data;
}

export async function patchCustomer(id, data) {
  return (await apiRequest(`/api/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })).data;
}

export async function deleteCustomer(id) {
  return apiRequest(`/api/customers/${id}`, { method: "DELETE" });
}

// Meters
export async function getMeters() {
  const result = await apiRequest("/api/meters");
  if (!Array.isArray(result.data)) {
    throw new Error("Invalid meters API response");
  }
  return result.data;
}

export async function createMeter(data) {
  return (await apiRequest("/api/meters", {
    method: "POST",
    body: JSON.stringify(data),
  })).data;
}

export async function replaceMeter(id, data) {
  return (await apiRequest(`/api/meters/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })).data;
}

export async function patchMeter(id, data) {
  return (await apiRequest(`/api/meters/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })).data;
}

export async function deleteMeter(id) {
  return apiRequest(`/api/meters/${id}`, { method: "DELETE" });
}

// Meter readings and consumption
export async function getMeterReadings(meterId) {
  return apiRequest(`/api/meters/${meterId}/readings`);
}

export async function createMeterReading(meterId, data) {
  return (await apiRequest(`/api/meters/${meterId}/readings`, {
    method: "POST",
    body: JSON.stringify(data),
  })).data;
}

export async function getMeterConsumption(meterId, from, to) {
  const params = new URLSearchParams({ from, to });

  const result = await apiRequest(
    `/api/meters/${meterId}/consumption?${params.toString()}`
  );

  return result.data;
}
