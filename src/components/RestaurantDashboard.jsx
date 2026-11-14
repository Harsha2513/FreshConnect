import { useEffect, useMemo, useState } from "react";
import { getProducts, getRestaurantOrders, getProfile, placeOrder } from "../services/api";
import "./RestaurantDashboard.css";

export default function RestaurantDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [p, o, pr] = await Promise.all([getProducts(), getRestaurantOrders(), getProfile()]);
      setProducts(p); setOrders(o); setProfile(pr);
      setDeliveryAddress(current => current || pr.address || "");
      setError("");
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.category || "").toLowerCase().includes(search.toLowerCase()) || (p.supplier || "").toLowerCase().includes(search.toLowerCase()));
  const groupedOrders = Object.values(orders.reduce((groups, row) => {
    if (!groups[row.orderId]) groups[row.orderId] = { orderId: row.orderId, status: row.status, total: row.total, createdAt: row.createdAt, address: row.deliveryAddress, items: [] };
    groups[row.orderId].items.push(row); return groups;
  }, {}));

  function addToCart(product) {
    setCart(previous => {
      const existing = previous.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= Number(product.stock)) { setError("Available stock limit reached."); return previous; }
        return previous.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...previous, { ...product, quantity: 1 }];
    });
  }
  function changeQuantity(id, value) {
    const product = cart.find(item => item.id === id);
    const quantity = Number(value);
    if (!product || !Number.isFinite(quantity) || quantity < 1) return;
    setCart(previous => previous.map(item => item.id === id ? { ...item, quantity: Math.min(quantity, Number(item.stock)) } : item));
  }

  async function checkout() {
    if (!cart.length) return;
    if (!deliveryAddress.trim()) { setError("Please enter your delivery address."); setTab("cart"); return; }
    setBusy(true); setError("");
    try {
      const result = await placeOrder(cart.map(item => ({ productId: item.id, quantity: item.quantity })), deliveryAddress.trim(), notes.trim());
      window.alert(`${result.message} Order #${result.orderId}`);
      setCart([]); setNotes(""); await load(); setTab("orders");
    } catch (e) { setError(e.message); await load(); }
    finally { setBusy(false); }
  }

  return <div className="restaurant-dashboard">
    <aside className="dashboard-sidebar"><h2>🌱 FreshConnect</h2><p className="sidebar-label">RESTAURANT PANEL</p>
      <nav>{[["overview", "🏠 Overview"], ["vegetables", "🥬 Vegetables"], ["cart", "🛒 My Cart"], ["orders", "📦 My Orders"], ["profile", "👤 My Profile"]].map(([key, label]) => <button key={key} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <button className="dashboard-logout" onClick={onLogout}>↪ Logout</button>
    </aside>
    <main className="dashboard-main">
      <header className="dashboard-topbar"><div><h2>Restaurant Dashboard</h2><p>Buy fresh vegetables directly from suppliers.</p></div><div className="user-info">👤 <strong>{user.name}</strong></div></header>
      <div className="dashboard-content">
        {error && <p role="alert" style={{ color: "crimson" }}>{error} <button onClick={load}>Retry</button></p>}

        {tab === "overview" && <>
          <h1>Welcome back, {user.name}! 👋</h1><p className="dashboard-subtitle">Fresh vegetables for your restaurant, all in one place.</p>
          <div className="dashboard-cards"><div className="dashboard-card"><span>🥬</span><h3>{products.length}</h3><p>Available Products</p></div><div className="dashboard-card"><span>🛒</span><h3>{cart.length}</h3><p>Cart Products</p></div><div className="dashboard-card"><span>📦</span><h3>{groupedOrders.length}</h3><p>Orders Placed</p></div><div className="dashboard-card"><span>💰</span><h3>₹{cartTotal.toFixed(2)}</h3><p>Current Cart Total</p></div></div>
          <h2 className="content-heading">Available Vegetables</h2><div className="dashboard-products">{products.slice(0, 4).map(p => <article className="dashboard-product" key={p.id}><h3>{p.name}</h3><p>{p.supplier || "Fresh supplier"}</p><h4>₹{p.price}/{p.unit}</h4><small>Stock: {p.stock} {p.unit}</small><button onClick={() => addToCart(p)}>+ Add to Cart</button></article>)}</div>
          {!products.length && <p>No products are currently listed by suppliers.</p>}
        </>}

        {tab === "vegetables" && <><h1>Browse Vegetables 🥬</h1><p className="dashboard-subtitle">Live products listed by farmers and wholesalers.</p><input className="dashboard-search" placeholder="Search name, category or supplier..." value={search} onChange={e => setSearch(e.target.value)} /><div className="dashboard-products">{filtered.map(p => <article className="dashboard-product" key={p.id}><h3>{p.name}</h3><p>{p.supplier || "Supplier"} · {p.district || "Kadapa"}</p><h4>₹{p.price}/{p.unit}</h4><small>Available: {p.stock} {p.unit}</small><button onClick={() => addToCart(p)}>+ Add to Cart</button></article>)}</div>{!filtered.length && <p>No matching vegetables available.</p>}</>}

        {tab === "cart" && <><h1>My Shopping Cart 🛒</h1>{cart.map(item => <div className="dashboard-cart-item" key={item.id}><strong>{item.name}</strong><input aria-label={`${item.name} quantity`} type="number" min="1" max={item.stock} value={item.quantity} onChange={e => changeQuantity(item.id, e.target.value)} /><span>₹{item.price} × {item.quantity}</span><strong>₹{(item.price * item.quantity).toFixed(2)}</strong><button onClick={() => setCart(current => current.filter(p => p.id !== item.id))}>Remove</button></div>)}{!cart.length && <p>Your cart is empty. Browse vegetables to add products.</p>}
          <h2 className="cart-total">Total: ₹{cartTotal.toFixed(2)}</h2>
          <label>Delivery Address</label><textarea className="dashboard-search" rows="3" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Enter complete delivery address" />
          <label>Order Notes (optional)</label><input className="dashboard-search" value={notes} onChange={e => setNotes(e.target.value)} maxLength="500" placeholder="Any delivery instructions?" />
          <button disabled={!cart.length || busy} onClick={checkout}>{busy ? "Placing Order..." : "Place Order"}</button>
        </>}

        {tab === "orders" && <><h1>My Orders 📦</h1>{groupedOrders.map(order => <div className="profile-card" key={order.orderId}><h3>Order #{order.orderId} · {order.status}</h3><p>{new Date(order.createdAt).toLocaleString()}</p>{order.address && <p><b>Delivery:</b> {order.address}</p>}{order.items.map((item, index) => <p key={`${item.orderId}-${index}`}>{item.productName} — {item.quantity} {item.unit} × ₹{item.price} · <b>{item.itemStatus}</b> · {item.supplier}</p>)}<b>Total: ₹{Number(order.total).toFixed(2)}</b></div>)}{!groupedOrders.length && <p>No orders placed yet.</p>}</>}

        {tab === "profile" && <><h1>My Profile 👤</h1>{profile && <div className="profile-card"><h2>{profile.name}</h2><p><b>Mobile:</b> {profile.phone}</p><p><b>Email:</b> {profile.email || "—"}</p><p><b>Restaurant:</b> {profile.businessName || "—"}</p><p><b>Address:</b> {profile.address}</p><p><b>District:</b> {profile.district}</p><p><b>Pincode:</b> {profile.pincode || "—"}</p></div>}</>}
      </div>
    </main>
  </div>;
}
