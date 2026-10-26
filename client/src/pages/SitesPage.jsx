
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import {
  getSites,
  getCustomers,
  createSite,
  replaceSite,
  patchSite,
  deleteSite,
} from "../services/sitesApi";

const STATUSES = ["Active", "Commissioning", "Maintenance"];
const TYPES = ["Steam", "Thermal Energy", "Bulk LPG"];

function SiteForm({ site, customers, onClose, onSave, error, saving }) {
  const [form, setForm] = useState(() => ({
    customerId: site?.customerId != null ? String(site.customerId) : "",
    name: site?.name ?? "",
    location: site?.location ?? "",
    serviceType: site?.serviceType ?? "Steam",
    status: site?.status ?? "Active",
  }));

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="modal-backdrop">
      <form
        className="modal-card"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(form);
        }}
      >
        <div className="modal-heading">
          <div>
            <p className="eyebrow">SITE DIRECTORY</p>
            <h2>{site ? "Edit site" : "Add site"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="form-grid">
          <label className="form-field form-field--full">
            Customer
            <select name="customerId" value={form.customerId} onChange={change} required>
              <option value="" disabled>Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={String(customer.id)}>
                  {customer.companyName}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            Site name
            <input name="name" value={form.name} onChange={change} required maxLength={120} />
          </label>

          <label className="form-field">
            Location
            <input name="location" value={form.location} onChange={change} required maxLength={200} />
          </label>

          <label className="form-field">
            Service type
            <select name="serviceType" value={form.serviceType} onChange={change}>
              {TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>

          <label className="form-field">
            Status
            <select name="status" value={form.status} onChange={change}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        {error && <div className="modal-error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button button--primary" type="submit" disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : "Save site"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function SitesPage() {
  const [sites, setSites] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [formSite, setFormSite] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteSite, setDeleteSite] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [siteData, customerData] = await Promise.all([
        getSites(),
        getCustomers(),
      ]);
      setSites(siteData);
      setCustomers(customerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visibleSites = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sites.filter((site) => {
      const matchesSearch = [
        site.name,
        site.customerName,
        site.location,
        site.serviceType,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));

      return matchesSearch &&
        (filter === "All statuses" || site.status === filter);
    });
  }, [sites, search, filter]);

  const metrics = [
    { label: "Total sites", value: sites.length, desc: "Registered locations", icon: Building2, color: "green" },
    { label: "Active sites", value: sites.filter((s) => s.status === "Active").length, desc: "Currently operational", icon: Activity, color: "blue" },
    { label: "Commissioning", value: sites.filter((s) => s.status === "Commissioning").length, desc: "Installation in progress", icon: Clock3, color: "amber" },
    { label: "Maintenance", value: sites.filter((s) => s.status === "Maintenance").length, desc: "Sites under maintenance", icon: Wrench, color: "rose" },
  ];

  async function save(form) {
    setSaving(true);
    setFormError("");

    try {
      if (!form.customerId) throw new Error("Select a customer.");

      const payload = { ...form, customerId: Number(form.customerId) };
      let saved;

      if (creating) {
        saved = await createSite(payload);
        setSites((current) => [...current, saved]);
        setNotice("Site created successfully.");
      } else {
        saved = await replaceSite(formSite.id, payload);
        setSites((current) => current.map((s) => s.id === saved.id ? saved : s));
        setNotice("Site updated successfully.");
      }

      setFormSite(null);
      setCreating(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save site.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(site, status) {
    if (!status || status === site.status) return;

    try {
      const updated = await patchSite(site.id, { status });
      setSites((current) => current.map((s) => s.id === updated.id ? updated : s));
      setNotice("Site status updated.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    }
  }

  async function remove() {
    try {
      await deleteSite(deleteSite.id);
      setSites((current) => current.filter((s) => s.id !== deleteSite.id));
      setDeleteSite(null);
      setNotice("Site deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete site.");
    }
  }

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONS / SITE DIRECTORY</div>
          <h1>Site management</h1>
          <p className="page-description">Manage industrial locations and their energy services.</p>
        </div>
        <div className="page-actions">
          <button
            className="button button--primary"
            onClick={() => {
              setFormSite(null);
              setCreating(true);
              setFormError("");
            }}
            disabled={!customers.some((c) => c.status === "Active")}
          >
            <Plus size={17} /> Add site
          </button>
          <button className="button button--secondary" onClick={load} disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner" role="alert"><p>{error}</p></div>}
      {notice && !error && <div className="notice-banner" role="status"><CheckCircle2 size={18} /> {notice}</div>}

      <section className="metrics-grid">
        {metrics.map(({ label, value, desc, icon: Icon, color }) => (
          <article className="metric-card" key={label}>
            <div className="metric-top">
              <span className="metric-label">{label}</span>
              <span className={`metric-icon metric-icon--${color}`}><Icon size={19} /></span>
            </div>
            <div className="metric-value">{value}</div>
            <div className="metric-description">{desc}</div>
          </article>
        ))}
      </section>

      <section className="site-panel">
        <div className="panel-heading">
          <div><h2>Industrial sites</h2><p>Sites linked to registered customers.</p></div>
          <span className="record-count">{sites.length} sites</span>
        </div>

        <div className="toolbar">
          <label className="search-box">
            <Search size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sites, customers, locations..." />
          </label>
          <label className="filter-box">
            <span className="filter-label">Status</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        </div>

        <div className="table-container">
          <table className="sites-table">
            <thead><tr><th>SITE</th><th>CUSTOMER</th><th>LOCATION</th><th>SERVICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-message">Loading sites...</td></tr>
              ) : visibleSites.length === 0 ? (
                <tr><td colSpan={6} className="table-message">No matching sites.</td></tr>
              ) : visibleSites.map((site) => (
                <tr key={site.id}>
                  <td><div className="site-name-cell"><span className="site-avatar"><Building2 size={18}/></span><div><strong>{site.name}</strong><span>Site ID: {site.id}</span></div></div></td>
                  <td>{site.customerName}</td>
                  <td><span className="location-cell"><MapPin size={15}/>{site.location}</span></td>
                  <td><span className="service-type">{site.serviceType}</span></td>
                  <td>
                    <select className="quick-status-select" value={site.status} onChange={(e) => changeStatus(site, e.target.value)}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><div className="row-actions">
                    <button className="row-action-button" title="Edit site" onClick={() => { setFormSite(site); setCreating(false); setFormError(""); }}><Pencil size={16}/></button>
                    <button className="row-action-button row-action-button--danger" title="Delete site" onClick={() => setDeleteSite(site)}><Trash2 size={16}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-footer"><span>Showing {visibleSites.length} of {sites.length} sites</span><span className="footer-note"><span className="online-dot"/> Data from MySQL</span></div>
      </section>

      {(creating || formSite) && (
        <SiteForm
          key={creating ? "create" : `edit-${formSite.id}`}
          site={formSite}
          customers={customers.filter((c) => c.status === "Active" || c.id === formSite?.customerId)}
          onClose={() => { setCreating(false); setFormSite(null); }}
          onSave={save}
          saving={saving}
          error={formError}
        />
      )}

      {deleteSite && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--small" role="alertdialog" aria-modal="true">
            <div className="delete-icon"><Trash2 size={23}/></div>
            <h2>Delete site?</h2>
            <p className="modal-description">Delete <strong>{deleteSite.name}</strong>? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="button button--secondary" onClick={() => setDeleteSite(null)}>Cancel</button>
              <button className="button button--danger" onClick={remove}>Delete site</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
