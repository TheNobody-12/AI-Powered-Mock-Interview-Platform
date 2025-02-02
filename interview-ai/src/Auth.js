import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // Ensure react-router-dom is installed

const Auth = () => {
  // Toggle between login (true) and register (false)
  const [isLogin, setIsLogin] = useState(true);

  // Form state: for registration, we use "name" in addition to email and password
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState(null);

  // For redirection after successful login
  const navigate = useNavigate();

  // Update form state on input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Toggle between login and registration modes
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError(null);
  };

  // Handle form submission for both login and registration
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Choose the endpoint based on mode
    const endpoint = isLogin ? "/api/login" : "/api/register";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (isLogin) {
        // Save the JWT token and redirect to dashboard
        localStorage.setItem("token", data.token);
        navigate("/dashboard");
      } else {
        // Registration was successful; optionally, automatically log in or notify the user.
        alert("Registration successful! Please log in.");
        // Reset form and toggle to login mode.
        setFormData({ name: "", email: "", password: "" });
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container" style={styles.container}>
      <h2>{isLogin ? "Login" : "Register"}</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        {!isLogin && (
          <div style={styles.formGroup}>
            <label htmlFor="name" style={styles.label}>Name</label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              required
            />
          </div>
        )}
        <div style={styles.formGroup}>
          <label htmlFor="email" style={styles.label}>Email</label>
          <input
            type="email"
            name="email"
            id="email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label htmlFor="password" style={styles.label}>Password</label>
          <input
            type="password"
            name="password"
            id="password"
            value={formData.password}
            onChange={handleChange}
            style={styles.input}
            required
          />
        </div>
        <button type="submit" style={styles.button}>
          {isLogin ? "Login" : "Register"}
        </button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
      <button onClick={toggleMode} style={styles.toggleButton}>
        {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
      </button>
    </div>
  );
};

// Simple inline styles (you can replace these with TailwindCSS or your preferred styling)
const styles = {
  container: {
    maxWidth: "400px",
    margin: "50px auto",
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    textAlign: "center"
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left"
  },
  label: {
    marginBottom: "5px",
    fontWeight: "bold"
  },
  input: {
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ccc"
  },
  button: {
    padding: "10px",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#4CAF50",
    color: "white",
    fontSize: "16px",
    cursor: "pointer"
  },
  toggleButton: {
    marginTop: "15px",
    padding: "8px",
    border: "none",
    background: "none",
    color: "#007BFF",
    textDecoration: "underline",
    cursor: "pointer"
  },
  error: {
    color: "red"
  }
};

export default Auth;
