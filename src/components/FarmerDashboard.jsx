import { useEffect, useMemo, useState } from "react";
import {
  addProduct, deleteProduct, getFarmerOrders, getMyProducts, getProfile,
  getSales, updateOrderStatus, updateProduct, updateStock,
} from "../services/api";
import "./FarmerDashboard.css";

const emptyForm = { name: "", category: "", description: "", price: "", stock: "", unit: "kg" };
const statusOptions = ["Accepted", "Processing", "OutForDelivery", "Delivered", "Cancelled"];

export default function FarmerDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState({});
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setError("");
    try {
      const [p, o, s, pr] = await Promise.all([
        getMyProducts(), getFarmerOrders(), getSales(), getProfile(),
      ]);
      setProducts(p); setOrders(o); setSales(s); setProfile(pr);
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  const totalStock = useMemo(() => products.reduce((sum, p) => sum + Number(p.stock || 0), 0), [products]);

  function startEdit(product) {
    setEditingId(product.id);
    setForm({ name: product.name, category: product.category || "", description: product.description || "", price: String(product.price), stock: String(product.stock), unit: product.unit || "kg" });
    setTab("add");
  }
  function resetForm() { setForm(emptyForm); setEditingId(null); }

  async function saveProduct(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
      if (editingId) await updateProduct(editingId, payload); else await addProduct(payload);
      resetForm(); await load(); setTab("products"); setNotice(editingId ? "Product updated successfully." : "Product added successfully.");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function changeStock(id, value, oldValue) {
    const next = Number(value);
    if (!Number.isFinite(next) || next < 0) { setError("Stock must be zero or more."); return; }
    if (next === Number(oldValue)) return;
    try { await updateStock(id, next); await load(); setNotice("Stock updated."); }
    catch (e) { setError(e.message); }
  }
  async function removeProduct(id) {
    if (!window.confirm("Remove this product from the marketplace?")) return;
    try { await deleteProduct(id); await load(); setNotice("Product removed from marketplace."); }
    catch (e) { setError(e.message); }
  }
  async function changeStatus(itemId, status) {
    try { await updateOrderStatus(itemId, status); await load(); setNotice("Order status updated."); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="farmer-dashboard">
      <aside className="farmer-sidebar">
        <h2>🌱 FreshConnect</h2><p className="farmer-label">SUPPLIER PANEL</p>
        <nav>
          {[["overview", "🏠 Overview"], ["add", editingId ? "✏️ Edit Product" : "➕ Add Vegetables"], ["products", "🥬 Manage Products"], ["stock", "📦 Stock Management"], ["orders", "🛒 Incoming Orders"], ["sales", "💰 Sales Overview"], ["profile", "👤 My Profile"]].map(([key, label]) => <button key={key} onClick={() => { if (key !== "add") resetForm(); setTab(key); }}>{label}</button>)}
        </nav>
        <button className="farmer-logout" onClick={onLogout}>↪ Logout</button>
      </aside>

      <main className="farmer-main">
        <header className="farmer-topbar"><div><h2>Supplier Dashboard</h2><p>Manage products, stock and restaurant orders.</p></div><div className="farmer-user">🌾 {user.name}</div></header>
        <section className="farmer-content">
          {error && <p role="alert" style={{ color: "crimson" }}>{error} <button onClick={load}>Retry</button></p>}
          {notice && <p role="status" style={{ color: "green" }}>{notice}</p>}

          {tab === "overview" && <>
            <h1>Welcome, {user.name}! 👋</h1><p className="farmer-subtitle">Your live marketplace overview.</p>
            <div className="farmer-stats">
              <div><span>🥬</span><h2>{products.length}</h2><p>Total Products</p></div>
              <div><span>📦</span><h2>{totalStock.toFixed(2)}</h2><p>Total Stock (mixed units)</p></div>
              <div><span>🛒</span><h2>{orders.length}</h2><p>Incoming Order Items</p></div>
              <div><span>💰</span><h2>₹{Number(sales.deliveredSales || 0).toFixed(2)}</h2><p>Delivered Sales</p></div>
            </div>
            <h2 className="farmer-heading">Recently Listed Products</h2><ProductTable products={products.slice(0, 5)} onEdit={startEdit} onDelete={removeProduct} />
          </>}

          {tab === "add" && <>
            <h1>{editingId ? "Edit Product ✏️" : "Add New Vegetable ➕"}</h1>
            <form className="farmer-form" onSubmit={saveProduct}>
              <label>Vegetable Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength="120" required />
              <label>Category</label><input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} maxLength="60" placeholder="Leafy, Root, Daily..." />
              <label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} maxLength="500" />
              <label>Price per Unit (₹)</label><input type="number" min="0.01" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              <label>Available Stock</label><input type="number" min="0" step="0.01" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} required />
              <label>Unit</label><select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}><option value="kg">Kilogram (kg)</option><option value="bunch">Bunch</option><option value="piece">Piece</option><option value="quintal">Quintal</option></select>
              <button type="submit" disabled={busy}>{busy ? "Saving..." : editingId ? "Save Changes" : "Add Product"}</button>
              {editingId && <button type="button" onClick={() => { resetForm(); setTab("products"); }}>Cancel Edit</button>}
            </form>
          </>}

          {tab === "products" && <><h1>Manage Products 🥬</h1><ProductTable products={products} onEdit={startEdit} onDelete={removeProduct} /></>}

          {tab === "stock" && <><h1>Stock Management 📦</h1><p className="farmer-subtitle">Enter the new stock quantity and move out of the field to save.</p><div className="farmer-table-wrapper"><table className="farmer-table"><thead><tr><th>Product</th><th>Price</th><th>Current Stock</th><th>New Stock</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td>{p.name}</td><td>₹{p.price}/{p.unit}</td><td>{p.stock} {p.unit}</td><td><input className="stock-input" type="number" min="0" step="0.01" defaultValue={p.stock} onBlur={e => changeStock(p.id, e.target.value, p.stock)} /></td></tr>)}</tbody></table>{!products.length && <p>No products available.</p>}</div></>}

          {tab === "orders" && <><h1>Incoming Orders 🛒</h1><div className="farmer-table-wrapper"><table className="farmer-table"><thead><tr><th>Order</th><th>Restaurant</th><th>Product</th><th>Quantity</th><th>Amount</th><th>Status</th><th>Update</th></tr></thead><tbody>{orders.map(o => <tr key={o.orderItemId}><td>#{o.orderId}</td><td>{o.restaurant}</td><td>{o.productName}</td><td>{o.quantity} {o.unit}</td><td>₹{Number(o.amount || 0).toFixed(2)}</td><td>{o.status}</td><td><select value={o.status} onChange={e => changeStatus(o.orderItemId, e.target.value)}>{["Pending", ...statusOptions].map(s => <option key={s} value={s}>{s}</option>)}</select></td></tr>)}</tbody></table>{!orders.length && <p>No incoming orders yet.</p>}</div></>}

          {tab === "sales" && <><h1>Sales Overview 💰</h1><div className="farmer-stats"><div><span>💰</span><h2>₹{Number(sales.deliveredSales || 0).toFixed(2)}</h2><p>Delivered Sales</p></div><div><span>📦</span><h2>{sales.deliveredOrders || 0}</h2><p>Delivered Orders</p></div><div><span>🧾</span><h2>{sales.totalItems || 0}</h2><p>Total Order Items</p></div></div></>}

          {tab === "profile" && <><h1>My Profile 👤</h1>{profile && <div className="farmer-profile"><h2>{profile.name}</h2><p><b>Mobile:</b> {profile.phone}</p><p><b>Email:</b> {profile.email || "Not provided"}</p><p><b>Business:</b> {profile.businessName || "—"}</p><p><b>Address:</b> {profile.address}</p><p><b>Village:</b> {profile.village || "—"}</p><p><b>District:</b> {profile.district || "—"}</p><p><b>Pincode:</b> {profile.pincode || "—"}</p></div>}</>}
        </section>
      </main>
    </div>
  );
}

function ProductTable({ products, onEdit, onDelete }) {
  return <div className="farmer-table-wrapper"><table className="farmer-table"><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.category || "—"}</td><td>₹{p.price}/{p.unit}</td><td>{p.stock} {p.unit}</td><td><button onClick={() => onEdit(p)}>Edit</button> <button className="farmer-delete" onClick={() => onDelete(p.id)}>Remove</button></td></tr>)}</tbody></table>{!products.length && <p>No products yet. Add your first vegetable.</p>}</div>;
}
