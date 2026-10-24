
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Gauge,
  LayoutDashboard,
  MapPin,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { getSites } from "./services/sitesApi";
import "./App.css";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, comingSoon: true },
  { label: "Sites", icon: Building2, active: true },
  { label: "Customers", icon: Users, comingSoon: true },
  { label: "Meter readings", icon: Gauge, comingSoon: true },
  { label: "Contracts", icon: FileText, comingSoon: true },
  { label: "Billing & invoices", icon: Receipt, comingSoon: true },
];

function SiteStatus({ status }) {
  const className = status.toLowerCase();

  const StatusIcon =
    status === "Active"
      ? CheckCircle2
      : status === "Commissioning"
        ? Clock3
        : Wrench;

  return (
    <span className={`status status--${className}`}>
      <StatusIcon size={14} />
      {status}
    </span>
  );
}

function App() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  const loadSites = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getSites();
      setSites(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load sites."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesSearch = [
        site.name,
        site.customerName,
        site.location,
        site.serviceType,
      ].some((value) => value?.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === "All statuses" ||
        site.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [sites, search, statusFilter]);

  const metrics = [
    {
      label: "Total sites",
      value: sites.length,
      description: "Registered locations",
      icon: Building2,
      color: "green",
    },
    {
      label: "Active sites",
      value: sites.filter((site) => site.status === "Active").length,
      description: "Currently operational",
      icon: Activity,
      color: "blue",
    },
    {
      label: "Commissioning",
      value: sites.filter((site) => site.status === "Commissioning").length,
      description: "Installation in progress",
      icon: Clock3,
      color: "amber",
    },
    {
      label: "Maintenance",
      value: sites.filter((site) => site.status === "Maintenance").length,
      description: "Maintenance status",
      icon: Wrench,
      color: "rose",
    },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Zap size={23} fill="currentColor" />
          </div>
          <div>
            <div className="brand-name">Enerwise</div>
            <div className="brand-caption">ENERGY OPERATIONS</div>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav className="navigation" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon, active, comingSoon }) => (
            <button
              key={label}
              type="button"
              className={`nav-item ${active ? "nav-item--active" : ""}`}
              disabled={comingSoon}
              title={comingSoon ? `${label} — coming soon` : label}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={19} />
              <span>{label}</span>
              {comingSoon && <span className="nav-soon">Soon</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <CircleHelp size={19} />
            </div>
            <div>
              <strong>Need a hand?</strong>
              <p>Your workspace guide</p>
            </div>
          </div>

          <div className="profile">
            <div className="avatar">OT</div>
            <div className="profile-info">
              <strong>Operations Team</strong>
              <span>Administrator</span>
            </div>
            <Settings size={17} className="profile-settings" />
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Operations</span>
            <span className="breadcrumb-divider">/</span>
            <strong>Sites</strong>
          </div>

          <div className="topbar-right">
            <div className="system-indicator">
              <span className="online-dot" />
              Local environment
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={19} />
              <span className="notification-dot" />
            </button>
            <div className="topbar-avatar">OT</div>
            <ChevronDown size={16} className="topbar-chevron" />
          </div>
        </header>

        <main className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">OPERATIONS / SITE DIRECTORY</div>
              <h1>Site management</h1>
              <p className="page-description">
                Monitor industrial locations and manage operational status
                across your energy network.
              </p>
            </div>

            <button
              type="button"
              className="button button--secondary"
              onClick={loadSites}
              disabled={loading}
            >
              <RefreshCw
                size={17}
                className={loading ? "spin" : ""}
              />
              {loading ? "Refreshing..." : "Refresh data"}
            </button>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <div>
                <strong>Couldn't load sites</strong>
                <p>{error}</p>
              </div>
              <button
                type="button"
                className="button button--secondary"
                onClick={loadSites}
              >
                Try again
              </button>
            </div>
          )}

          <section className="metrics-grid" aria-label="Site summary">
            {metrics.map(({ label, value, description, icon: Icon, color }) => (
              <article className="metric-card" key={label}>
                <div className="metric-top">
                  <span className="metric-label">{label}</span>
                  <span className={`metric-icon metric-icon--${color}`}>
                    <Icon size={19} />
                  </span>
                </div>
                <div className="metric-value">{value}</div>
                <div className="metric-description">{description}</div>
              </article>
            ))}
          </section>

          <section className="site-panel">
            <div className="panel-heading">
              <div>
                <h2>Industrial sites</h2>
                <p>View and monitor all registered locations.</p>
              </div>
              <span className="record-count">
                {sites.length} {sites.length === 1 ? "site" : "sites"}
              </span>
            </div>

            <div className="toolbar">
              <label className="search-box">
                <Search size={18} />
                <input
                  type="search"
                  placeholder="Search sites, customers, locations..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search industrial sites"
                />
                {search && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </label>

              <label className="filter-box">
                <span className="filter-label">Status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter by status"
                >
                  <option>All statuses</option>
                  <option>Active</option>
                  <option>Commissioning</option>
                  <option>Maintenance</option>
                </select>
              </label>
            </div>

            <div className="table-container">
              <table className="sites-table">
                <thead>
                  <tr>
                    <th>SITE</th>
                    <th>CUSTOMER</th>
                    <th>LOCATION</th>
                    <th>SERVICE TYPE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="table-message">
                        <RefreshCw size={20} className="spin" />
                        Loading site records...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} className="table-message">
                        Site records could not be loaded. Please try again.
                      </td>
                    </tr>
                  ) : filteredSites.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="table-message">
                        No sites match your search or selected status.
                      </td>
                    </tr>
                  ) : (
                    filteredSites.map((site) => (
                      <tr key={site.id}>
                        <td>
                          <div className="site-name-cell">
                            <span className="site-avatar">
                              <Building2 size={18} />
                            </span>
                            <div>
                              <strong>{site.name}</strong>
                              <span>Site ID: {site.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="customer-name">
                            {site.customerName}
                          </span>
                        </td>
                        <td>
                          <span className="location-cell">
                            <MapPin size={15} />
                            {site.location}
                          </span>
                        </td>
                        <td>
                          <span className="service-type">
                            {site.serviceType}
                          </span>
                        </td>
                        <td>
                          <SiteStatus status={site.status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                Showing {filteredSites.length} of {sites.length} sites
              </span>
              <span className="footer-note">
                <span className="online-dot" />
                Data from backend API
              </span>
            </div>
          </section>

          <footer className="page-footer">
            <span>Enerwise Operations Console</span>
            <span>Industrial energy management</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
