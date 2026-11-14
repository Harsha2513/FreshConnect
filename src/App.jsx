import { useEffect, useState } from "react";
import { getProducts } from "./services/api";
import Registration from "./components/Registration";
import "./App.css";
import Login from "./components/Login";
import RestaurantDashboard from "./components/RestaurantDashboard";
import FarmerDashboard from "./components/FarmerDashboard";
import AdminDashboard from "./components/AdminDashboard";
const categories = ["All", "Daily", "Root", "Leafy"];

function App() {
  const [vegetables, setVegetables] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(() => {
  const savedUser = localStorage.getItem("user");
  return savedUser ? JSON.parse(savedUser) : null;
});

  useEffect(() => {
    getProducts()
      .then((rows) => setVegetables(rows.map((item) => ({ ...item, image: "photo-1542838132-92c53300491e" }))))
      .catch((error) => setProductsError(error.message))
      .finally(() => setProductsLoading(false));
  }, []);

  const filteredVegetables = vegetables.filter((item) => {
    const matchesCategory =
      category === "All" || item.category === category;

    const matchesSearch = item.name
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  function addToCart(product) {
    setCart((previous) => {
      const existing = previous.find((item) => item.id === product.id);

      if (existing) {
        return previous.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previous, { ...product, quantity: 1 }];
    });
  }

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
if (loggedInUser) {
  if (loggedInUser.role === "Admin") {
    return <AdminDashboard user={loggedInUser} onLogout={() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setLoggedInUser(null);
    }} />;
  }
  if (loggedInUser.role === "Restaurant") {
    return (
      <RestaurantDashboard
        user={loggedInUser}
        onLogout={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setLoggedInUser(null);
        }}
      />
    );

  }
if (loggedInUser.role === "Farmer" || loggedInUser.role === "Wholesaler") {
  return (
    <FarmerDashboard
      user={loggedInUser}
      onLogout={() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setLoggedInUser(null);
      }}
    />
  );
}
  return (
    <div className="dashboard">
      <h1>Welcome, {loggedInUser.name}!</h1>
      <h2>{loggedInUser.role} Dashboard</h2>
      <button onClick={() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setLoggedInUser(null);
      }}>
        Logout
      </button>
    </div>
  );
}
  return (
    <div className="website">

      {/* HEADER */}
      <header className="header">
        <div className="container navbar">
          <a href="#" className="logo">
            <span className="logo-icon">🌱</span>
            <span>Fresh<span>Connect</span></span>
          </a>

          <nav>
            <a href="#home">Home</a>
            <a href="#products">Vegetables</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#suppliers">For Suppliers</a>
          </nav>

          <div className="header-actions">
            <button className="cart-button">
              🛒 Cart <span>{cartCount}</span>
            </button>
<button
  className="login-button"
  onClick={() => setShowLogin(true)}
>
  Login
</button>          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="hero" id="home">
        <div className="container hero-content">
          <div className="hero-text">
            <span className="tagline">
              🌿 FARM FRESH. DIRECT TO YOUR BUSINESS.
            </span>

            <h1>
              Fresh Vegetables.
              <br />
              <span>Better Business.</span>
            </h1>

            <p>
              Connecting farmers and wholesalers directly with restaurants.
              Get fresh vegetables at competitive wholesale prices.
            </p>

            <div className="hero-buttons">
              <a href="#products" className="primary-button">
                Explore Vegetables →
              </a>

              <a href="#suppliers" className="secondary-button">
                Become a Supplier
              </a>
            </div>

            <div className="hero-location">
              📍 Currently serving Kadapa and surrounding areas
            </div>
          </div>

          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=900"
              alt="Fresh vegetables in a market"
            />

            <div className="image-label">
              <span>🌱</span>
              <div>
                <strong>Fresh from Farms</strong>
                <small>Quality you can trust</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="benefits">
        <div className="container benefits-grid">
          <div>🌾 <strong>Direct Farm Sourcing</strong></div>
          <div>💰 <strong>Wholesale Pricing</strong></div>
          <div>🚚 <strong>Reliable Delivery</strong></div>
          <div>🥬 <strong>Fresh Quality</strong></div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="products-section" id="products">
        <div className="container">

          <div className="section-heading">
            <span>OUR FRESH COLLECTION</span>
            <h2>Explore Fresh Vegetables</h2>
            <p>Quality vegetables for restaurants and food businesses.</p>
          </div>

          <div className="product-controls">
            <input
              type="text"
              placeholder="Search vegetables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="category-buttons">
              {categories.map((item) => (
                <button
                  key={item}
                  className={category === item ? "active" : ""}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="product-grid">
            {productsLoading ? <p>Loading fresh products...</p> : filteredVegetables.map((item) => (
              <div className="product-card" key={item.id}>

                <div className="product-image">
                  <img
                    src={`https://images.unsplash.com/${item.image || "photo-1542838132-92c53300491e"}?w=500&auto=format&fit=crop`}
                    alt={item.name}
                  />
                  <span className="fresh-badge">Fresh</span>
                </div>

                <div className="product-info">
                  <small>{item.supplier}</small>
                  <h3>{item.name}</h3>

                  <div className="product-bottom">
                    <div className="price">
                      ₹{item.price}
                      <span> / {item.unit}</span>
                    </div>

                    <button onClick={() => addToCart(item)}>
                      + Add
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {productsError && <p className="no-products">{productsError}</p>}
          {!productsLoading && filteredVegetables.length === 0 && (
            <p className="no-products">No vegetables are currently available. Please check back soon.</p>
          )}

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section" id="how-it-works">
        <div className="container">
          <div className="section-heading">
            <span>SIMPLE PROCESS</span>
            <h2>How FreshConnect Works</h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <span>01</span>
              <h3>Choose Vegetables</h3>
              <p>Browse fresh vegetables and compare available prices.</p>
            </div>

            <div className="step-card">
              <span>02</span>
              <h3>Place Your Order</h3>
              <p>Restaurants can order their required quantities.</p>
            </div>

            <div className="step-card">
              <span>03</span>
              <h3>Get Delivery</h3>
              <p>FreshConnect coordinates delivery to your business.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPLIER SECTION */}
      <section className="supplier-section" id="suppliers">
        <div className="container supplier-content">
          <div>
            <span>GROW WITH FRESHCONNECT</span>
            <h2>Are You a Farmer or Wholesaler?</h2>
            <p>
              Connect with restaurants, reach more buyers and grow
              your vegetable business with FreshConnect.
            </p>
          </div>

<button
  className="supplier-button"
  onClick={() => setShowRegistration(true)}
>
  Join as a Supplier →
</button>        </div>
      </section>

      {/* CART SUMMARY */}
      <section className="cart-summary container">
        <h2>Your Cart</h2>

        {cart.length === 0 ? (
          <p>Your cart is empty. Add some fresh vegetables!</p>
        ) : (
          <>
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <span>{item.name}</span>
                <span>{item.quantity} × ₹{item.price}</span>
              </div>
            ))}

            <h3>Total: ₹{cartTotal}</h3>
          </>
        )}
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-content">
          <div>
            <h2>🌱 FreshConnect</h2>
            <p>Connecting farms to food businesses.</p>
          </div>

          <p>© 2026 FreshConnect. All rights reserved.</p>
          <p>📍 Kadapa, Andhra Pradesh</p>
        </div>
      </footer>
      {showRegistration && (
  <Registration
    onClose={() => setShowRegistration(false)}
  />
)}
{showLogin && (
  <Login
    onClose={() => setShowLogin(false)}
    onLogin={(user) => {
      setLoggedInUser(user);
      setShowLogin(false);
    }}
    onRegister={() => {
      setShowLogin(false);
      setShowRegistration(true);
    }}
  />
)}    </div>
  );
}

export default App;

