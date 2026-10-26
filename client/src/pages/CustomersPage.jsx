
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Building2, CheckCircle2, Clock3, Mail, Pencil, Phone,
  Plus, RefreshCw, Save, Search, Trash2, UserRound, Users, X,
} from "lucide-react";

import {
  getCustomers, getSites, createCustomer, replaceCustomer,
  patchCustomer, deleteCustomer,
} from "../services/sitesApi";

const STATUSES = ["Active", "Inactive"];

function CustomerForm({ customer, onClose, onSave, saving, error }) {
  const [form, setForm] = useState(() => ({
    companyName: customer?.companyName ?? "",
    contactName: customer?.contactName ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    billingAddress: customer?.billingAddress ?? "",
    status: customer?.status ?? "Active",
  }));

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="modal-backdrop">
      <form className="modal-card" onSubmit={(event) => { event.preventDefault(); onSave(form); }}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">CUSTOMER DIRECTORY</p>
            <h2>{customer ? "Edit customer" : "Add customer"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}><X size={19}/></button>
        </div>

        <div className="form-grid">
          <label className="form-field form-field--full">Company name
            <input name="companyName" value={form.companyName} onChange={change} required maxLength={120}/>
          </label>
          <label className="form-field">Contact person
            <input name="contactName" value={form.contactName} onChange={change} maxLength={120}/>
          </label>
          <label className="form-field">Phone
            <input name="phone" type="tel" value={form.phone} onChange={change} maxLength={30}/>
          </label>
          <label className="form-field form-field--full">Email
            <input name="email" type="email" value={form.email} onChange={change} maxLength={254}/>
          </label>
          <label className="form-field form-field--full">Billing address
            <textarea name="billingAddress" value={form.billingAddress} onChange={change} rows={3} maxLength={255}/>
          </label>
          <label className="form-field">Status
            <select name="status" value={form.status} onChange={change}>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        {error && <div className="modal-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="button button--primary" disabled={saving}>
            <Save size={16}/> {saving ? "Saving..." : "Save customer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [formCustomer, setFormCustomer] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [customerData, siteData] = await Promise.all([getCustomers(), getSites()]);
      setCustomers(customerData);
      setSites(siteData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matches = [
        customer.companyName, customer.contactName,
        customer.email, customer.phone,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));

      return matches &&
        (filter === "All statuses" || customer.status === filter);
    });
  }, [customers, search, filter]);

  const metrics = [
    { label: "Total customers", value: customers.length, desc: "Registered companies", icon: Users, color: "green" },
    { label: "Active customers", value: customers.filter((c) => c.status === "Active").length, desc: "Active accounts", icon: Activity, color: "blue" },
    { label: "Inactive customers", value: customers.filter((c) => c.status === "Inactive").length, desc: "Inactive accounts", icon: Clock3, color: "amber" },
    { label: "Sites assigned", value: new Set(sites.map((s) => s.customerId).filter(Boolean)).size, desc: "Customers with sites", icon: Building2, color: "rose" },
  ];

  async function save(form) {
    setSaving(true);
    setFormError("");

    const payload = {
      companyName: form.companyName.trim(),
      contactName: form.contactName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      billingAddress: form.billingAddress.trim(),
      status: form.status,
    };

    try {
      if (creating) {
        const created = await createCustomer(payload);
        setCustomers((current) => [...current, created]);
        setNotice("Customer created successfully.");
      } else if (formCustomer) {
        const updated = await replaceCustomer(formCustomer.id, payload);
        setCustomers((current) => current.map((c) => c.id === updated.id ? updated : c));
        setSites(await getSites());
        setNotice("Customer updated successfully.");
      }

      setCreating(false);
      setFormCustomer(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save customer.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(customer, status) {
    if (!status || status === customer.status) return;

    try {
      const updated = await patchCustomer(customer.id, { status });
      setCustomers((current) => current.map((c) => c.id === updated.id ? updated : c));
      setNotice("Customer status updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update status.");
    }
  }

  async function remove() {
    try {
      await deleteCustomer(deleteCandidate.id);
      setCustomers((current) => current.filter((c) => c.id !== deleteCandidate.id));
      setDeleteCandidate(null);
      setNotice("Customer deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete customer.");
    }
  }

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONS / CUSTOMER DIRECTORY</div>
          <h1>Customer management</h1>
          <p className="page-description">Manage customer companies and their contact and billing details.</p>
        </div>
        <div className="page-actions">
          <button className="button button--primary" onClick={() => { setCreating(true); setFormCustomer(null); setFormError(""); }}>
            <Plus size={17}/> Add customer
          </button>
          <button className="button button--secondary" onClick={load} disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""}/> Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner" role="alert"><p>{error}</p></div>}
      {notice && !error && <div className="notice-banner" role="status"><CheckCircle2 size={18}/> {notice}</div>}

      <section className="metrics-grid">
        {metrics.map(({ label, value, desc, icon: Icon, color }) => (
          <article className="metric-card" key={label}>
            <div className="metric-top">
              <span className="metric-label">{label}</span>
              <span className={`metric-icon metric-icon--${color}`}><Icon size={19}/></span>
            </div>
            <div className="metric-value">{value}</div>
            <div className="metric-description">{desc}</div>
          </article>
        ))}
      </section>

      <section className="site-panel">
        <div className="panel-heading">
          <div><h2>Customer directory</h2><p>Company records and primary contacts.</p></div>
          <span className="record-count">{customers.length} customers</span>
        </div>
        <div className="toolbar">
          <label className="search-box">
            <Search size={18}/>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company, contact, email or phone..."/>
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
          <table className="sites-table customers-table">
            <thead><tr><th>COMPANY</th><th>CONTACT</th><th>EMAIL</th><th>PHONE</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="table-message">Loading customers...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={6} className="table-message">No matching customers.</td></tr>
              ) : visible.map((customer) => (
                <tr key={customer.id}>
                  <td><div className="site-name-cell"><span className="site-avatar"><Building2 size={18}/></span><div><strong>{customer.companyName}</strong><span>Customer ID: {customer.id}</span></div></div></td>
                  <td><span className="customer-detail"><UserRound size={15}/>{customer.contactName || "Not provided"}</span></td>
                  <td><span className="customer-detail"><Mail size={15}/>{customer.email || "Not provided"}</span></td>
                  <td><span className="customer-detail"><Phone size={15}/>{customer.phone || "Not provided"}</span></td>
                  <td>
                    <select className="quick-status-select" value={customer.status} onChange={(e) => changeStatus(customer, e.target.value)}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="row-action-button" title="Edit customer" onClick={() => { setFormCustomer(customer); setCreating(false); setFormError(""); }}><Pencil size={16}/></button>
                      <button className="row-action-button row-action-button--danger" title="Delete customer" onClick={() => setDeleteCandidate(customer)}><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing {visible.length} of {customers.length} customers</span><span className="footer-note"><span className="online-dot"/> Data from MySQL</span></div>
      </section>

      {(creating || formCustomer) && (
        <CustomerForm
          key={creating ? "create" : `edit-${formCustomer.id}`}
          customer={formCustomer}
          onClose={() => { setCreating(false); setFormCustomer(null); }}
          onSave={save}
          saving={saving}
          error={formError}
        />
      )}

      {deleteCandidate && (
        <div className="modal-backdrop">
          <div className="modal-card modal-card--small" role="alertdialog" aria-modal="true">
            <div className="delete-icon"><Trash2 size={23}/></div>
            <h2>Delete customer?</h2>
            <p className="modal-description">
              Delete <strong>{deleteCandidate.companyName}</strong>? Customers linked to sites cannot be deleted.
            </p>
            <div className="modal-actions">
              <button className="button button--secondary" onClick={() => setDeleteCandidate(null)}>Cancel</button>
              <button className="button button--danger" onClick={remove}>Delete customer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
