import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CircleHelp,
  FileText,
  Gauge,
  LayoutDashboard,
  MapPin,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";

import {
  createSite,
  deleteSite,
  getCustomers,
  getSites,
  patchSite,
  replaceSite,
} from "./services/sitesApi";

import "./App.css";
import "./SiteManagement.css";

const navigation = [
  { label: "Overview", icon: LayoutDashboard, comingSoon: true },
  { label: "Sites", icon: Building2, active: true },
  { label: "Customers", icon: Users, comingSoon: true },
  { label: "Meter readings", icon: Gauge, comingSoon: true },
  { label: "Contracts", icon: FileText, comingSoon: true },
  { label: "Billing & invoices", icon: Receipt, comingSoon: true },
];

const SITE_STATUSES = [
  "Active",
  "Commissioning",
  "Maintenance",
];

const SERVICE_TYPES = [
  "Steam",
  "Thermal Energy",
  "Bulk LPG",
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

function SiteFormModal({
  mode,
  site,
  customers,
  customersLoading,
  customersError,
  onClose,
  onSave,
  saving,
  error,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() => ({
    customerId:
      site?.customerId != null
        ? String(site.customerId)
        : "",
    name: site?.name ?? "",
    location: site?.location ?? "",
    serviceType: site?.serviceType ?? "Steam",
    status: site?.status ?? "Active",
  }));

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >
      <form
        className="modal-card"
        onSubmit={handleSubmit}
        aria-labelledby="site-form-title"
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">SITE MANAGEMENT</p>

            <h2 id="site-form-title">
              {isEdit ? "Edit site" : "Add new site"}
            </h2>

            <p className="modal-description">
              {isEdit
                ? "Update this site's information."
                : "Register a new industrial location."}
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="Close form"
            onClick={onClose}
            disabled={saving}
          >
            <X size={19} />
          </button>
        </div>

        <div className="form-grid">
          <label className="form-field form-field--full">
            Customer

            <select
              name="customerId"
              value={form.customerId}
              onChange={handleChange}
              required
              disabled={
                customersLoading ||
                customers.length === 0
              }
            >
              <option value="" disabled>
                {customersLoading
                  ? "Loading customers..."
                  : customers.length === 0
                    ? "No active customers available"
                    : "Select a customer"}
              </option>

              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={String(customer.id)}
                >
                  {customer.companyName}
                </option>
              ))}
            </select>

            {customersError && (
              <span className="field-error" role="alert">
                {customersError}
              </span>
            )}
          </label>

          <label className="form-field">
            Site name

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Chennai Plant"
              required
              maxLength={120}
            />
          </label>

          <label className="form-field">
            Location

            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="City, State"
              required
              maxLength={200}
            />
          </label>

          <label className="form-field">
            Service type

            <select
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
              required
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            Site status

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              required
            >
              {SITE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div className="modal-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="button button--primary"
            disabled={saving || customersLoading}
          >
            <Save size={16} />

            {saving
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Create site"}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteSiteModal({
  site,
  onClose,
  onConfirm,
  deleting,
  error,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !deleting
        ) {
          onClose();
        }
      }}
    >
      <div
        className="modal-card modal-card--small"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        <div className="delete-icon">
          <Trash2 size={23} />
        </div>

        <h2 id="delete-title">Delete this site?</h2>

        <p className="modal-description">
          You're about to delete{" "}
          <strong>{site.name}</strong>.
          This operation removes the site from the current data store.
        </p>

        {error && (
          <div className="modal-error" role="alert">
            {error}
          </div>
        )}

        <div className="modal-actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="button button--danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            <Trash2 size={16} />

            {deleting ? "Deleting..." : "Delete site"}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("All statuses");

  const [siteModalMode, setSiteModalMode] = useState(null);
  const [editingSite, setEditingSite] = useState(null);
  const [formError, setFormError] = useState("");
  const [savingSite, setSavingSite] = useState(false);

  const [notice, setNotice] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingSiteId, setDeletingSiteId] = useState(null);

  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const loadSites = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getSites();
      setSites(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sites."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    setCustomersError("");

    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (err) {
      setCustomersError(
        err instanceof Error
          ? err.message
          : "Unable to load customers."
      );
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const activeCustomers = useMemo(
    () => customers.filter(
      (customer) => customer.status === "Active"
    ),
    [customers]
  );

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sites.filter((site) => {
      const values = [
        site.name,
        site.customerName,
        site.location,
        site.serviceType,
      ];

      const matchesSearch = values.some(
        (value) =>
          String(value ?? "").toLowerCase().includes(query)
      );

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
      value: sites.filter(
        (site) => site.status === "Active"
      ).length,
      description: "Currently operational",
      icon: Activity,
      color: "blue",
    },
    {
      label: "Commissioning",
      value: sites.filter(
        (site) => site.status === "Commissioning"
      ).length,
      description: "Installation in progress",
      icon: Clock3,
      color: "amber",
    },
    {
      label: "Maintenance",
      value: sites.filter(
        (site) => site.status === "Maintenance"
      ).length,
      description: "Sites requiring maintenance",
      icon: Wrench,
      color: "rose",
    },
  ];

  function openCreateSite() {
    setEditingSite(null);
    setFormError("");
    setNotice("");
    setSiteModalMode("create");
  }

  function openEditSite(site) {
    setEditingSite(site);
    setFormError("");
    setNotice("");
    setSiteModalMode("edit");
  }

  function closeSiteModal() {
    if (savingSite) return;

    setSiteModalMode(null);
    setEditingSite(null);
    setFormError("");
  }

  async function handleSaveSite(formData) {
    setSavingSite(true);
    setFormError("");

    try {
      if (!formData.customerId) {
        throw new Error("Please select a customer.");
      }

      // Send the customer's numeric ID, not the company name.
      const payload = {
        ...formData,
        customerId: Number(formData.customerId),
      };

      if (siteModalMode === "create") {
        const created = await createSite(payload);

        setSites((current) => [...current, created]);
        setNotice("Site created successfully.");
      } else if (
        siteModalMode === "edit" &&
        editingSite
      ) {
        const updated = await replaceSite(
          editingSite.id,
          payload
        );

        setSites((current) =>
          current.map((site) =>
            site.id === updated.id ? updated : site
          )
        );

        setNotice("Site details updated successfully.");
      }

      setError("");
      setSiteModalMode(null);
      setEditingSite(null);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : "Unable to save the site."
      );
    } finally {
      setSavingSite(false);
    }
  }

  async function handleStatusChange(site, newStatus) {
    if (!newStatus || site.status === newStatus) {
      return;
    }

    setUpdatingStatusId(site.id);
    setError("");
    setNotice("");

    try {
      const updated = await patchSite(site.id, {
        status: newStatus,
      });

      setSites((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      setNotice(`Status updated for ${site.name}.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update site status."
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function handleDeleteSite() {
    if (!deleteCandidate) return;

    const site = deleteCandidate;

    setDeletingSiteId(site.id);
    setDeleteError("");

    try {
      await deleteSite(site.id);

      setSites((current) =>
        current.filter((item) => item.id !== site.id)
      );

      setError("");
      setNotice(`${site.name} was deleted successfully.`);
      setDeleteCandidate(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "Unable to delete the site."
      );
    } finally {
      setDeletingSiteId(null);
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Zap size={23} fill="currentColor" />
          </div>

          <div>
            <div className="brand-name">Enerwise</div>
            <div className="brand-caption">
              ENERGY OPERATIONS
            </div>
          </div>
        </div>

        <div className="workspace-label">WORKSPACE</div>

        <nav
          className="navigation"
          aria-label="Main navigation"
        >
          {navigation.map(
            ({ label, icon: Icon, active, comingSoon }) => (
              <button
                key={label}
                type="button"
                className={`nav-item ${
                  active ? "nav-item--active" : ""
                }`}
                disabled={comingSoon}
                title={
                  comingSoon ? `${label} — coming soon` : label
                }
                aria-current={active ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>

                {comingSoon && (
                  <span className="nav-soon">Soon</span>
                )}
              </button>
            )
          )}
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

            <Settings
              size={17}
              className="profile-settings"
            />
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

            <ChevronDown
              size={16}
              className="topbar-chevron"
            />
          </div>
        </header>

        <main className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                OPERATIONS / SITE DIRECTORY
              </div>

              <h1>Site management</h1>

              <p className="page-description">
                Monitor industrial locations and manage
                operational status across your energy network.
              </p>
            </div>

            <div className="page-actions">
              <button
                type="button"
                className="button button--primary"
                onClick={openCreateSite}
                disabled={
                  customersLoading ||
                  activeCustomers.length === 0
                }
                title={
                  activeCustomers.length === 0
                    ? "An active customer is required to create a site"
                    : "Create a site"
                }
              >
                <Plus size={17} />
                Add site
              </button>

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
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <div>
                <strong>Something went wrong</strong>
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

          {notice && !error && (
            <div className="notice-banner" role="status">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}

          <section
            className="metrics-grid"
            aria-label="Site summary"
          >
            {metrics.map(
              ({
                label,
                value,
                description,
                icon: Icon,
                color,
              }) => (
                <article
                  className="metric-card"
                  key={label}
                >
                  <div className="metric-top">
                    <span className="metric-label">
                      {label}
                    </span>

                    <span
                      className={`metric-icon metric-icon--${color}`}
                    >
                      <Icon size={19} />
                    </span>
                  </div>

                  <div className="metric-value">
                    {value}
                  </div>

                  <div className="metric-description">
                    {description}
                  </div>
                </article>
              )
            )}
          </section>

          <section className="site-panel">
            <div className="panel-heading">
              <div>
                <h2>Industrial sites</h2>
                <p>
                  View and monitor all registered locations.
                </p>
              </div>

              <span className="record-count">
                {sites.length}{" "}
                {sites.length === 1 ? "site" : "sites"}
              </span>
            </div>

            <div className="toolbar">
              <label className="search-box">
                <Search size={18} />

                <input
                  type="search"
                  placeholder="Search sites, customers, locations..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
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
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  aria-label="Filter by status"
                >
                  <option>All statuses</option>

                  {SITE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
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
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="table-message"
                      >
                        <RefreshCw
                          size={20}
                          className="spin"
                        />
                        Loading site records...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="table-message"
                      >
                        Site records could not be loaded.
                        Please try again.
                      </td>
                    </tr>
                  ) : filteredSites.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="table-message"
                      >
                        No sites match your search or status.
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
                          <div className="site-status-cell">
                            <SiteStatus status={site.status} />

                            <select
                              className="quick-status-select"
                              value=""
                              disabled={
                                updatingStatusId === site.id
                              }
                              aria-label={
                                `Change status for ${site.name}`
                              }
                              onChange={(event) =>
                                handleStatusChange(
                                  site,
                                  event.target.value
                                )
                              }
                            >
                              <option value="" disabled>
                                {updatingStatusId === site.id
                                  ? "Updating..."
                                  : "Change"}
                              </option>

                              {SITE_STATUSES.map((status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  Set {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="row-action-button"
                              aria-label={`Edit ${site.name}`}
                              title="Edit site"
                              onClick={() => openEditSite(site)}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="row-action-button row-action-button--danger"
                              aria-label={`Delete ${site.name}`}
                              title="Delete site"
                              onClick={() => {
                                setDeleteCandidate(site);
                                setDeleteError("");
                                setNotice("");
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                Showing {filteredSites.length} of{" "}
                {sites.length} sites
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

      {siteModalMode && (
        <SiteFormModal
          key={`${siteModalMode}-${editingSite?.id ?? "new"}`}
          mode={siteModalMode}
          site={editingSite}
          customers={activeCustomers}
          customersLoading={customersLoading}
          customersError={customersError}
          onClose={closeSiteModal}
          onSave={handleSaveSite}
          saving={savingSite}
          error={formError}
        />
      )}

      {deleteCandidate && (
        <DeleteSiteModal
          site={deleteCandidate}
          onClose={() => {
            if (deletingSiteId === null) {
              setDeleteCandidate(null);
              setDeleteError("");
            }
          }}
          onConfirm={handleDeleteSite}
          deleting={deletingSiteId === deleteCandidate.id}
          error={deleteError}
        />
      )}
    </div>
  );
}

export default App;