const API_URL = "http://127.0.0.1:5000";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({
    message: "Unexpected server response.",
  }));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// Authentication
export const registerUser = (formData) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(formData),
  });

export const loginUser = (credentials) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

// Products
export const getProducts = async () => {
  const rows = await request("/api/products");

  return rows.map((p) => ({
    id: p.ProductId ?? p.id,
    name: p.ProductName ?? p.name,
    category: p.Category ?? p.category ?? "Other",
    description: p.Description ?? p.description ?? "",
    price: Number(p.Price ?? p.price),
    stock: Number(p.Stock ?? p.stock),
    unit: p.Unit ?? p.unit ?? "kg",
    supplier: p.SupplierName ?? p.BusinessName ?? "Local Supplier",
  }));
};

export const getMyProducts = async () => {
  const rows = await request("/api/my-products");

  return rows.map((p) => ({
    ...p,
    id: p.ProductId ?? p.id,
    name: p.ProductName ?? p.name,
    price: Number(p.Price ?? p.price),
    stock: Number(p.Stock ?? p.stock),
    unit: p.Unit ?? p.unit ?? "kg",
  }));
};

export const addProduct = (data) =>
  request("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateProduct = (id, data) =>
  request(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteProduct = (id) =>
  request(`/api/products/${id}`, {
    method: "DELETE",
  });

export const updateStock = (id, stock) =>
  request(`/api/products/${id}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stock }),
  });

// Orders
export const placeOrder = (items, deliveryAddress, notes = "") =>
  request("/api/orders", {
    method: "POST",
    body: JSON.stringify({ items, deliveryAddress, notes }),
  });

export const getRestaurantOrders = () =>
  request("/api/restaurant-orders");

export const getFarmerOrders = () =>
  request("/api/farmer-orders");

export const updateOrderStatus = (itemId, status) =>
  request(`/api/order-items/${itemId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// Profile and Sales
export const getSales = () => request("/api/sales");

export const getProfile = () => request("/api/profile");

export const updateProfile = (data) =>
  request("/api/profile", {
    method: "PUT",
    body: JSON.stringify(data),
  });