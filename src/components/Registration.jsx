import { useState } from "react";
import { registerUser } from "../services/api";
import "./Registration.css";

function Registration({ onClose }) {
  const [userType, setUserType] = useState("Restaurant");

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    businessName: "",
    address: "",
    village: "",
    district: "Kadapa",
    pincode: "",
  });

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

async function handleSubmit(e) {
  e.preventDefault();

  try {
    const payload = {
      ...form,
      userType,
    };

    const result = await registerUser(payload);

    alert(result.message);

    setForm({
      fullName: "",
      phone: "",
      email: "",
      password: "",
      businessName: "",
      address: "",
      village: "",
      district: "Kadapa",
      pincode: "",
    });

  } catch (error) {
    alert(error.message);
  }
  }

  return (
    <div className="registration-overlay" onClick={onClose}>      <div
        className="registration-box"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="registration-close" onClick={onClose}>
          ×
        </button>

        <div className="registration-header">
          <span>🌱 FRESHCONNECT</span>
          <h2>Create Your Account</h2>
          <p>Join our growing fresh vegetable marketplace.</p>
        </div>

        <div className="account-types">
          {["Restaurant", "Farmer", "Wholesaler"].map((type) => (
            <button
              key={type}
              type="button"
              className={userType === type ? "selected" : ""}
              onClick={() => setUserType(type)}
            >
              {type === "Restaurant" && "🍽️"}
              {type === "Farmer" && "🌾"}
              {type === "Wholesaler" && "🏪"}
              <span>{type}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          <label>Contact Person Name *</label>
          <input
            name="fullName"
            placeholder="Enter your full name"
            value={form.fullName}
            onChange={handleChange}
            required
          />

          <label>Mobile Number *</label>
          <input
            name="phone"
            type="tel"
            placeholder="10-digit mobile number"
            pattern="[0-9]{10}"
            maxLength="10"
            value={form.phone}
            onChange={handleChange}
            required
          />

          <label>Email Address</label>
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
          />

          <label>Password *</label>
          <input
            name="password"
            type="password"
            minLength="8"
            placeholder="Minimum 8 characters"
            value={form.password}
            onChange={handleChange}
            required
          />

          <label>
            {userType === "Restaurant"
              ? "Restaurant Name *"
              : "Farm / Business Name"}
          </label>

          <input
            name="businessName"
            placeholder={
              userType === "Restaurant"
                ? "Enter restaurant name"
                : "Enter business name"
            }
            value={form.businessName}
            onChange={handleChange}
            required={userType === "Restaurant"}
          />

          <label>Full Address *</label>
          <textarea
            name="address"
            placeholder="Enter complete address"
            value={form.address}
            onChange={handleChange}
            required
          />

          {userType !== "Restaurant" && (
            <>
              <label>Village</label>
              <input
                name="village"
                placeholder="Enter village name"
                value={form.village}
                onChange={handleChange}
              />
            </>
          )}

          <label>District</label>
          <input
            name="district"
            value={form.district}
            onChange={handleChange}
          />

          <label>Pincode</label>
          <input
            name="pincode"
            placeholder="6-digit pincode"
            pattern="[0-9]{6}"
            maxLength="6"
            value={form.pincode}
            onChange={handleChange}
          />

          <button type="submit" className="registration-submit">
            Create My Account →
          </button>
        </form>

        <p className="registration-note">
          By registering, you agree to FreshConnect's terms and conditions.
        </p>
      </div>
    </div>
  );
}

export default Registration;