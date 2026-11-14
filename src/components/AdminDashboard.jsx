import { useCallback, useEffect, useState } from "react";
import "./AdminDashboard.css";

const API = "http://127.0.0.1:5000/api/admin";

async function adminRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Admin request failed");
  }

  return data;
}

export default function AdminDashboard({ user, onLogout }) {
  const [section, setSection] = useState("Overview");

  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [o, u, p, ord, a, logs] = await Promise.all([
        adminRequest("/overview"),
        adminRequest("/users"),
        adminRequest("/products"),
        adminRequest("/orders"),
        adminRequest("/analytics"),
        adminRequest("/activity-logs"),
      ]);

      setOverview(o);
      setUsers(u);
      setProducts(p);
      setOrders(ord);
      setAnalytics(a);
      setActivityLogs(logs);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleUser(row) {
    try {
      await adminRequest(`/users/${row.userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function toggleProduct(row) {
    try {
      await adminRequest(`/products/${row.productId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !row.isActive }),
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateOrderStatus(order, status) {
    try {
      await adminRequest(`/orders/${order.itemId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  function exportCSV(filename, rows) {
    if (!rows.length) {
      setError("No data available to export.");
      return;
    }

    const headers = Object.keys(rows[0]);

    const escapeCSV = (value) => {
      const text = value == null ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) =>
        headers.map((header) => escapeCSV(row[header])).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  }

  const nav = [
    "Overview",
    "Users",
    "Products",
    "Orders",
    "Analytics",
    "Activity Logs",
  ];

  const filteredUsers = users.filter((x) => {
    const matchesSearch = `${x.name} ${x.phone} ${x.role} ${
      x.businessName || ""
    }`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "All" || x.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const filteredProducts = products.filter((x) =>
    `${x.name} ${x.supplierName || ""} ${x.supplier || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredOrders = orders.filter((x) =>
    `${x.orderId} ${x.restaurant} ${x.productName} ${x.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredLogs = activityLogs.filter((x) =>
    `${x.action} ${x.description} ${x.adminName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const orderStatuses = [
    "Accepted",
    "Processing",
    "OutForDelivery",
    "Delivered",
  ];

  return (
    <div className="fc-admin">
      <aside className="fc-admin-side">
        <div className="fc-admin-brand">
          🌱 FreshConnect
          <small>ADMIN CONSOLE</small>
        </div>

        <div className="fc-admin-nav">
          {nav.map((n) => (
            <button
              key={n}
              className={section === n ? "selected" : ""}
              onClick={() => {
                setSection(n);
                setSearch("");
                setRoleFilter("All");
              }}
            >
              {({
                Overview: "▦",
                Users: "♙",
                Products: "🥬",
                Orders: "▣",
                Analytics: "📊",
                "Activity Logs": "📋",
              })[n]}
              <span>{n}</span>
            </button>
          ))}
        </div>

        <div className="fc-admin-side-bottom">
          <span>
            Signed in as
            <br />
            <b>{user?.name || "Administrator"}</b>
          </span>
          <button onClick={onLogout}>↪ Logout</button>
        </div>
      </aside>

      <main className="fc-admin-main">
        <header className="fc-admin-top">
          <div>
            <span>FRESHCONNECT / ADMIN</span>
            <h1>{section}</h1>
          </div>

          <div className="fc-admin-user">
            🛡️ {user?.name || "Admin"}
          </div>
        </header>

        {error && (
          <div className="fc-admin-error">
            {error}
            <button onClick={() => setError("")}>✕</button>
          </div>
        )}

        {loading ? (
          <div className="fc-admin-loading">
            Loading admin data…
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {section === "Overview" && overview && (
              <>
                <div className="fc-admin-welcome">
                  <div>
                    <span>CONTROL CENTER</span>
                    <h2>
                      Good to see you, {user?.name || "Admin"} 👋
                    </h2>
                    <p>
                      Here’s what is happening across your marketplace.
                    </p>
                  </div>

                  <button onClick={load}>↻ Refresh data</button>
                </div>

                <div className="fc-admin-stats">
                  <Stat
                    icon="♙"
                    label="Total Users"
                    value={overview.users?.total ?? 0}
                    note={`${overview.users?.active ?? 0} active accounts`}
                  />

                  <Stat
                    icon="🌾"
                    label="Suppliers"
                    value={overview.suppliers ?? 0}
                    note="Farmers & wholesalers"
                  />

                  <Stat
                    icon="🍽️"
                    label="Restaurants"
                    value={overview.restaurants ?? 0}
                    note="Registered buyers"
                  />

                  <Stat
                    icon="🥬"
                    label="Products"
                    value={overview.products?.total ?? 0}
                    note={`${overview.products?.active ?? 0} active listings`}
                  />

                  <Stat
                    icon="📦"
                    label="Orders"
                    value={overview.orders?.total ?? 0}
                    note={`${overview.orders?.pending ?? 0} pending`}
                  />

                  <Stat
                    icon="₹"
                    label="Delivered Sales"
                    value={`₹${Number(
                      overview.deliveredSales || 0
                    ).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}`}
                    note={`${overview.orders?.delivered ?? 0} delivered orders`}
                  />
                </div>

                <div className="fc-admin-panel">
                  <div className="fc-admin-panel-head">
                    <div>
                      <h3>Recent orders</h3>
                      <p>Latest order items across FreshConnect</p>
                    </div>

                    <button onClick={() => setSection("Orders")}>
                      View all →
                    </button>
                  </div>

                  <OrderTable rows={orders.slice(0, 6)} />
                </div>
              </>
            )}

            {/* USERS */}
            {section === "Users" && (
              <Panel
                title="User management"
                subtitle={`${users.length} registered accounts`}
                search={search}
                setSearch={setSearch}
                onExport={() =>
                  exportCSV(
                    "FreshConnect_Users.csv",
                    filteredUsers
                  )
                }
              >
                <div className="fc-admin-filters">
                  <label>Filter by role:</label>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="All">All Roles</option>
                    <option value="Farmer">Farmer</option>
                    <option value="Wholesaler">Wholesaler</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div className="fc-admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Business</th>
                        <th>District</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredUsers.map((u) => (
                        <tr key={u.userId}>
                          <td>
                            <b>{u.name}</b>
                            <small>
                              {u.phone} · {u.email || "No email"}
                            </small>
                          </td>

                          <td>
                            <span className="fc-admin-role">
                              {u.role}
                            </span>
                          </td>

                          <td>{u.businessName || "—"}</td>
                          <td>{u.district || "—"}</td>

                          <td>
                            <Status active={u.isActive} />
                          </td>

                          <td>
                            {u.role === "Admin" ? (
                              "Protected"
                            ) : (
                              <button
                                className="fc-admin-action"
                                onClick={() => toggleUser(u)}
                              >
                                {u.isActive ? "Deactivate" : "Activate"}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!filteredUsers.length && (
                    <p className="fc-admin-empty">No users found.</p>
                  )}
                </div>
              </Panel>
            )}

            {/* PRODUCTS */}
            {section === "Products" && (
              <Panel
                title="Product management"
                subtitle={`${products.length} listed products`}
                search={search}
                setSearch={setSearch}
                onExport={() =>
                  exportCSV(
                    "FreshConnect_Products.csv",
                    filteredProducts
                  )
                }
              >
                <div className="fc-admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Supplier</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr key={p.productId}>
                          <td>
                            <b>{p.name}</b>
                            <small>
                              {p.category || "Uncategorized"}
                            </small>
                          </td>

                          <td>
                            {p.supplierName || p.supplier || "—"}
                          </td>

                          <td>
                            ₹{Number(p.price).toFixed(2)}/{p.unit}
                          </td>

                          <td>
                            {p.stock} {p.unit}
                          </td>

                          <td>
                            <Status active={p.isActive} />
                          </td>

                          <td>
                            <button
                              className="fc-admin-action"
                              onClick={() => toggleProduct(p)}
                            >
                              {p.isActive ? "Hide listing" : "Publish"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!filteredProducts.length && (
                    <p className="fc-admin-empty">
                      No products found.
                    </p>
                  )}
                </div>
              </Panel>
            )}

            {/* ORDERS */}
            {section === "Orders" && (
              <Panel
                title="All marketplace orders"
                subtitle={`${orders.length} order items`}
                search={search}
                setSearch={setSearch}
                onExport={() =>
                  exportCSV(
                    "FreshConnect_Orders.csv",
                    filteredOrders
                  )
                }
              >
                <div className="fc-admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Restaurant</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Amount</th>
                        <th>Item Status</th>
                        <th>Update Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOrders.map((o, i) => (
                        <tr key={`${o.orderId}-${o.itemId || i}`}>
                          <td>
                            <b>#{o.orderId}</b>
                          </td>

                          <td>{o.restaurant}</td>
                          <td>{o.productName}</td>

                          <td>
                            {o.quantity} {o.unit}
                          </td>

                          <td>
                            ₹
                            {Number(
                              o.unitPrice
                                ? o.unitPrice * o.quantity
                                : o.total || 0
                            ).toFixed(2)}
                          </td>

                          <td>
                            <span className="fc-admin-role">
                              {o.itemStatus || o.status}
                            </span>
                          </td>

                          <td>
                            {o.itemStatus === "Cancelled" ||
                            o.itemStatus === "Delivered" ? (
                              "—"
                            ) : (
                              <select
                                value={o.itemStatus || o.status}
                                onChange={(e) =>
                                  updateOrderStatus(o, e.target.value)
                                }
                              >
                                {orderStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>

                          <td>
                            {o.createdAt
                              ? new Date(o.createdAt).toLocaleDateString(
                                  "en-IN"
                                )
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!filteredOrders.length && (
                    <p className="fc-admin-empty">No orders found.</p>
                  )}
                </div>
              </Panel>
            )}

            {/* ANALYTICS */}
            {section === "Analytics" && analytics && (
              <>
                <div className="fc-admin-stats">
                  <Stat
                    icon="₹"
                    label="Total Revenue"
                    value={`₹${Number(
                      analytics.summary?.totalRevenue || 0
                    ).toLocaleString("en-IN")}`}
                    note="From delivered order items"
                  />

                  <Stat
                    icon="📦"
                    label="Delivered Orders"
                    value={analytics.summary?.deliveredOrders ?? 0}
                    note="Completed order items"
                  />
                </div>

                <div className="fc-admin-panel">
                  <div className="fc-admin-panel-head">
                    <div>
                      <h3>Daily Revenue</h3>
                      <p>Revenue from delivered items by order date</p>
                    </div>

                    <button
                      onClick={() =>
                        exportCSV(
                          "FreshConnect_Daily_Revenue.csv",
                          analytics.daily || []
                        )
                      }
                    >
                      ↓ Export CSV
                    </button>
                  </div>

                  <RevenueChart data={analytics.daily || []} />
                </div>

                <div className="fc-admin-panel">
                  <div className="fc-admin-panel-head">
                    <div>
                      <h3>Monthly Revenue</h3>
                      <p>Monthly delivered sales performance</p>
                    </div>

                    <button
                      onClick={() =>
                        exportCSV(
                          "FreshConnect_Monthly_Revenue.csv",
                          analytics.monthly || []
                        )
                      }
                    >
                      ↓ Export CSV
                    </button>
                  </div>

                  <RevenueChart
                    data={(analytics.monthly || []).map((x) => ({
                      date: `${x.month}/${x.year}`,
                      revenue: x.revenue,
                    }))}
                  />
                </div>
              </>
            )}

            {/* ACTIVITY LOGS */}
            {section === "Activity Logs" && (
              <Panel
                title="Admin activity logs"
                subtitle={`${activityLogs.length} recorded activities`}
                search={search}
                setSearch={setSearch}
                onExport={() =>
                  exportCSV(
                    "FreshConnect_Admin_Activity_Logs.csv",
                    filteredLogs
                  )
                }
              >
                <div className="fc-admin-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Admin</th>
                        <th>Action</th>
                        <th>Description</th>
                        <th>Date & Time</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredLogs.map((log) => (
                        <tr key={log.logId}>
                          <td>
                            <b>{log.adminName || "Admin"}</b>
                          </td>

                          <td>
                            <span className="fc-admin-role">
                              {log.action}
                            </span>
                          </td>

                          <td>{log.description}</td>

                          <td>
                            {log.createdAt
                              ? new Date(log.createdAt).toLocaleString(
                                  "en-IN"
                                )
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {!filteredLogs.length && (
                    <p className="fc-admin-empty">
                      No activity logs found.
                    </p>
                  )}
                </div>
              </Panel>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, label, value, note }) {
  return (
    <div className="fc-admin-stat">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{note}</em>
    </div>
  );
}

function Status({ active }) {
  return (
    <span className={`fc-admin-status ${active ? "on" : "off"}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  search,
  setSearch,
  onExport,
  children,
}) {
  return (
    <section className="fc-admin-panel">
      <div className="fc-admin-panel-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>

        <div className="fc-admin-panel-tools">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
          />

          {onExport && (
            <button onClick={onExport}>↓ Export CSV</button>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}

function OrderTable({ rows }) {
  return (
    <div className="fc-admin-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Restaurant</th>
            <th>Product</th>
            <th>Quantity</th>
            <th>Amount</th>
            <th>Item status</th>
            <th>Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((o, i) => (
            <tr key={`${o.orderId}-${o.itemId || i}`}>
              <td>
                <b>#{o.orderId}</b>
              </td>
              <td>{o.restaurant}</td>
              <td>{o.productName}</td>
              <td>
                {o.quantity} {o.unit}
              </td>
              <td>
                ₹
                {Number(
                  o.unitPrice
                    ? o.unitPrice * o.quantity
                    : o.total || 0
                ).toFixed(2)}
              </td>
              <td>
                <span className="fc-admin-role">
                  {o.itemStatus || o.status}
                </span>
              </td>
              <td>
                {o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString("en-IN")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {!rows.length && (
        <p className="fc-admin-empty">No orders found.</p>
      )}
    </div>
  );
}

function RevenueChart({ data }) {
  const maxRevenue = Math.max(
    ...data.map((x) => Number(x.revenue || 0)),
    1
  );

  return (
    <div className="fc-admin-chart">
      {!data.length ? (
        <p className="fc-admin-empty">No revenue data available.</p>
      ) : (
        data.map((item, index) => (
          <div className="fc-admin-chart-row" key={index}>
            <span>{item.date}</span>

            <div className="fc-admin-chart-track">
              <div
                className="fc-admin-chart-bar"
                style={{
                  width: `${
                    (Number(item.revenue || 0) / maxRevenue) * 100
                  }%`,
                }}
              />
            </div>

            <b>
              ₹
              {Number(item.revenue || 0).toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            </b>
          </div>
        ))
      )}
    </div>
  );
}