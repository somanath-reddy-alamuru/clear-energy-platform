
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, Clock3, FileText, Plus, RefreshCw,
  Receipt, Search, Calculator,
} from "lucide-react";

import {
  getInvoices, getContracts, createInvoice, patchInvoice,
} from "../services/sitesApi";

import "../FinancialPages.css";

function localDateTime(date) {
  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function currency(value, code = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function InvoiceForm({ contracts, onClose, onSave, saving, error }) {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const due = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    contractId: "",
    periodStart: localDateTime(start),
    periodEnd: localDateTime(now),
    dueDate: localDate(due),
    taxRate: "0",
  });

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose();
    }}>
      <form className="modal-card" onSubmit={(event) => {
        event.preventDefault();

        onSave({
          ...form,
          contractId: Number(form.contractId),
          taxRate: Number(form.taxRate),
        });
      }}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">BILLING / INVOICES</p>
            <h2>Generate invoice</h2>
            <p className="modal-description">
              Charges are calculated from the contract rate and cumulative meter readings.
            </p>
          </div>
        </div>

        <div className="form-grid">
          <label className="form-field form-field--full">
            Active contract
            <select name="contractId" value={form.contractId} onChange={change} required>
              <option value="">Select a contract</option>
              {contracts.filter((c) => c.status === "Active").map((contract) => (
                <option key={contract.id} value={String(contract.id)}>
                  {contract.contractCode} — {contract.customerName} — {contract.meterCode}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            Billing period start
            <input name="periodStart" type="datetime-local" value={form.periodStart} onChange={change} required/>
          </label>

          <label className="form-field">
            Billing period end
            <input name="periodEnd" type="datetime-local" value={form.periodEnd} onChange={change} required min={form.periodStart}/>
          </label>

          <label className="form-field">
            Due date
            <input name="dueDate" type="date" value={form.dueDate} onChange={change} required/>
          </label>

          <label className="form-field">
            Tax rate (%)
            <input name="taxRate" type="number" min="0" max="28" step="0.01" value={form.taxRate} onChange={change} required/>
          </label>
        </div>

        <p className="financial-help">
          Ensure meter readings exist at or before both period boundaries. Duplicate invoices for the same contract and period are not allowed.
        </p>

        {error && <div className="modal-error" role="alert">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="button button--secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="button button--primary" disabled={saving || contracts.every((c) => c.status !== "Active")}>
            <Calculator size={16}/>{saving ? "Calculating..." : "Generate invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}

function InvoiceStatus({ status }) {
  const className = status.toLowerCase();

  return <span className={`financial-status financial-status--${className}`}>{status}</span>;
}

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [invoiceData, contractData] = await Promise.all([
        getInvoices(),
        getContracts(),
      ]);

      setInvoices(invoiceData);
      setContracts(contractData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load invoices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const matches = [
        invoice.invoiceNumber,
        invoice.customerName,
        invoice.siteName,
        invoice.contractCode,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));

      return matches &&
        (statusFilter === "All statuses" || invoice.status === statusFilter);
    });
  }, [invoices, search, statusFilter]);

  const outstanding = invoices
    .filter((invoice) => ["Draft", "Issued"].includes(invoice.status))
    .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);

  const paidTotal = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);

  async function generate(payload) {
    setSaving(true);
    setFormError("");

    try {
      const created = await createInvoice(payload);
      setInvoices((current) => [created, ...current]);
      setShowForm(false);
      setNotice(`Invoice ${created.invoiceNumber} generated successfully.`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to generate invoice."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(invoice, status) {
    try {
      const result = await patchInvoice(invoice.id, { status });

      setInvoices((current) =>
        current.map((item) => item.id === result.id ? result : item)
      );

      setNotice(`Invoice ${result.invoiceNumber} status changed to ${status}.`);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update invoice.");
    }
  }

  const metrics = [
    { label: "Total invoices", value: invoices.length, description: "Generated billing records", icon: FileText, color: "green" },
    { label: "Outstanding", value: currency(outstanding), description: "Draft and issued invoices", icon: Clock3, color: "amber" },
    { label: "Paid amount", value: currency(paidTotal), description: "Invoices marked paid", icon: CheckCircle2, color: "blue" },
    { label: "Active contracts", value: contracts.filter((c) => c.status === "Active").length, description: "Available for billing", icon: Receipt, color: "rose" },
  ];

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">FINANCE / BILLING</div>
          <h1>Billing & invoices</h1>
          <p className="page-description">Calculate charges from actual meter usage and track invoice status.</p>
        </div>
        <div className="page-actions">
          <button className="button button--primary" onClick={() => { setShowForm(true); setFormError(""); setNotice(""); }} disabled={contracts.every((c) => c.status !== "Active")}>
            <Plus size={17}/> Generate invoice
          </button>
          <button className="button button--secondary" onClick={load} disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""}/> Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner" role="alert"><p>{error}</p></div>}
      {notice && !error && <div className="notice-banner" role="status"><CheckCircle2 size={18}/>{notice}</div>}

      <section className="metrics-grid">
        {metrics.map(({ label, value, description, icon: Icon, color }) => (
          <article className="metric-card" key={label}>
            <div className="metric-top">
              <span className="metric-label">{label}</span>
              <span className={`metric-icon metric-icon--${color}`}><Icon size={19}/></span>
            </div>
            <div className="metric-value financial-metric-value">{loading ? "—" : value}</div>
            <div className="metric-description">{description}</div>
          </article>
        ))}
      </section>

      <section className="site-panel">
        <div className="panel-heading">
          <div><h2>Invoice register</h2><p>Consumption-based billing records.</p></div>
          <span className="record-count">{invoices.length} invoices</span>
        </div>

        <div className="toolbar">
          <label className="search-box">
            <Search size={18}/>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice, contract, customer or site..."/>
          </label>
          <label className="filter-box">
            <span className="filter-label">Status</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option>All statuses</option>
              {["Draft", "Issued", "Paid", "Void"].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <div className="table-container">
          <table className="sites-table">
            <thead><tr><th>INVOICE</th><th>CUSTOMER / SITE</th><th>PERIOD</th><th>CONSUMPTION</th><th>TOTAL</th><th>DUE DATE</th><th>STATUS / ACTIONS</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-message">Loading invoices...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} className="table-message">No invoices found. Create a contract and generate an invoice.</td></tr>
              ) : visible.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoiceNumber}</strong><div className="financial-muted">{invoice.contractCode}</div></td>
                  <td><strong>{invoice.customerName}</strong><div className="financial-muted">{invoice.siteName}</div></td>
                  <td>{String(invoice.periodStart).slice(0, 10)}<div className="financial-muted">to {String(invoice.periodEnd).slice(0, 10)}</div></td>
                  <td>{Number(invoice.consumption).toLocaleString("en-IN", { maximumFractionDigits: 3 })} {invoice.unit}</td>
                  <td><strong>{currency(invoice.totalAmount, invoice.currency)}</strong><div className="financial-muted">Tax {Number(invoice.taxRate)}%</div></td>
                  <td>{invoice.dueDate}</td>
                  <td>
                    <div className="invoice-action-cell">
                      <InvoiceStatus status={invoice.status}/>
                      {invoice.status === "Draft" && <button className="small-action" onClick={() => changeStatus(invoice, "Issued")}>Issue</button>}
                      {invoice.status === "Issued" && <button className="small-action" onClick={() => changeStatus(invoice, "Paid")}>Mark paid</button>}
                      {["Draft", "Issued"].includes(invoice.status) && <button className="small-action small-action--danger" onClick={() => changeStatus(invoice, "Void")}>Void</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing {visible.length} of {invoices.length} invoices</span><span className="footer-note"><span className="online-dot"/> Data from MySQL</span></div>
      </section>

      {showForm && (
        <InvoiceForm
          contracts={contracts}
          onClose={() => setShowForm(false)}
          onSave={generate}
          saving={saving}
          error={formError}
        />
      )}
    </main>
  );
}
