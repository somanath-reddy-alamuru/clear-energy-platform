
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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

function getList(path, label) {
  return apiRequest(path).then((result) => {
    if (!Array.isArray(result.data)) {
      throw new Error(`Invalid ${label} API response`);
    }
    return result.data;
  });
}

// Sites
export const getSites = () => getList("/api/sites", "sites");

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
export const getCustomers = () => getList("/api/customers", "customers");

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
export const getMeters = () => getList("/api/meters", "meters");

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

// Readings
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

  return (await apiRequest(
    `/api/meters/${meterId}/consumption?${params.toString()}`
  )).data;
}

// Contracts
export const getContracts = () => getList("/api/contracts", "contracts");

export async function createContract(data) {
  return (await apiRequest("/api/contracts", {
    method: "POST",
    body: JSON.stringify(data),
  })).data;
}

export async function replaceContract(id, data) {
  return (await apiRequest(`/api/contracts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })).data;
}

export async function patchContract(id, data) {
  return (await apiRequest(`/api/contracts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })).data;
}

export async function deleteContract(id) {
  return apiRequest(`/api/contracts/${id}`, { method: "DELETE" });
}

// Invoices
export const getInvoices = () => getList("/api/invoices", "invoices");

export async function createInvoice(data) {
  return (await apiRequest("/api/invoices", {
    method: "POST",
    body: JSON.stringify(data),
  })).data;
}

export async function patchInvoice(id, data) {
  return (await apiRequest(`/api/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })).data;
}
