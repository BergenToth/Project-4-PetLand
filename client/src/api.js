const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

async function request(path, options) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    credentials: "include"
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const api = {
  me: () => request("/api/me", { method: "GET" }),
  register: (body) => request("/api/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/api/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request("/api/logout", { method: "POST", body: JSON.stringify({}) }),

  categories: () => request("/api/categories", { method: "GET" }),
  questionsByCategory: (categoryId) => request(`/api/questions?categoryId=${categoryId}`, { method: "GET" }),
  createQuestion: (body) => request("/api/questions", { method: "POST", body: JSON.stringify(body) }),
  getQuestion: (id) => request(`/api/questions/${id}`, { method: "GET" }),
  addAnswer: (id, body) => request(`/api/questions/${id}/answers`, { method: "POST", body: JSON.stringify(body) })
};
