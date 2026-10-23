
import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [status, setStatus] = useState(
    "Connecting to backend..."
  );

  useEffect(() => {
    fetch("http://localhost:5000/api/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error("API request failed");
        }

        return response.json();
      })
      .then((data) => {
        setStatus(data.message);
      })
      .catch(() => {
        setStatus("Connection failed. Check the backend.");
      });
  }, []);

  return (
    <main className="app">
      <p className="eyebrow">CLEAR ENERGY · OPERATIONS</p>
      <h1>Energy Operations Console</h1>
      <p className="subtitle">
        Industrial energy monitoring and billing platform
      </p>

      <section className="panel">
        <h2>System Status</h2>
        <p>{status}</p>
      </section>
    </main>
  );
}

export default App;
