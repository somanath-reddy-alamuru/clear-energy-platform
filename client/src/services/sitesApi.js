const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export async function getSites() {
  const response = await fetch(`${API_BASE_URL}/api/sites`);

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Request failed with status ${response.status}`
    );
  }

  if (!Array.isArray(result.data)) {
    throw new Error("The sites API returned an unexpected response");
  }

  return result.data;
}