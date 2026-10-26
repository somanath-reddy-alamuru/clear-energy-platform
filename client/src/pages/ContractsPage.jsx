
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText, Plus, RefreshCw, Search, Pencil,
  Trash2, CheckCircle2, Building2, Gauge, Save, X,
} from "lucide-react";

import {
  getContracts, getSites, getMeters,
  createContract, replaceContract, patchContract, deleteContract,
} from "../services/sitesApi";

import "../FinancialPages.css";

const STATUSES = ["Active", "Inactive", "Expired"];

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function ContractModal({ contract, meters, sites, onClose, onSave, saving, error }) {
  const [form, setForm] = useState({
    contractCode: contract?.contractCode ?? "",
    meterId: contract ? String(contract.meterId) : "",
    ratePerUnit: contract ? String(contract.ratePerUnit) : "",
    startDate: contract?.startDate ?? localDate(),
    endDate: contract?.endDate ?? "",
    status: contract?.status ?? "Active",
  });

  const selectedMeter = meters.find(
    (meter) => String(meter.id) === form.meterId
  );

  const selectedSite = sites.find(
    (site) => site.id === selectedMeter?.siteId
  );

  const availableMeters = meters.filter(
    (meter) =>
      meter.status === "Active" || meter.id === contract?.meterId
  );

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

        if (!selectedMeter || !selectedSite) return;

        onSave({
          contractCode: form.contractCode.trim(),
          customerId: selectedSite.customerId,
          siteId: selectedSite.id,
          meterId: selectedMeter.id,
          serviceType: selectedMeter.meterType,
          ratePerUnit: Number(form.ratePerUnit),
          currency: "INR",
          startDate: form.startDate,
          endDate: form.endDate || null,
          status: form.status,
        });
      }}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">CONTRACT MANAGEMENT</p>
            <h2>{contract ? "Edit contract" : "Create contract"}</h2>
            <p className="modal-description">Define a service agreement and its unit rate.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={19}/>
          </button>
        </div>

        <div className="form-grid">
          <label className="form-field form-field--full">
            Contract code
            <input name="contractCode" value={form.contractCode} onChange={change} maxLength={60} required placeholder="CTR-2026-001"/>
          </label>

          <label className="form-field form-field--full">
            Meter
            <select name="meterId" value={form.meterId} onChange={change} required>
              <option value="">Select an active meter</option>
              {availableMeters.map((meter) => (
                <option key={meter.id} value={String(meter.id)}>
                  {meter.meterCode} — {meter.meterName}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            Customer
            <input value={selectedSite?.customerName ?? contract?.customerName ?? ""} readOnly placeholder="Selected from meter"/>
          </label>

          <label className="form-field">
            Site
            <input value={selectedSite?.name ?? contract?.siteName ?? ""} readOnly placeholder="Selected from meter"/>
          </label>

          <label className="form-field">
            Service type
            <input value={selectedMeter?.meterType ?? contract?.serviceType ?? ""} readOnly placeholder="Select a meter"/>
          </label>

          <label className="form-field">
            Unit rate (₹)
            <input name="ratePerUnit" type="number" min="0.0001" step="0.0001" value={form.ratePerUnit} onChange={change} required/>
          </label>

          <label className="form-field">
            Start date
            <input name="startDate" type="date" value={form.startDate} onChange={change} required/>
          </label>

          <label className="form-field">
            End date (optional)
            <input name="endDate" type="date" value={form.endDate} onChange={change} min={form.startDate}/>
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
          <button type="button" className="button button--secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="button button--primary" type="submit" disabled={saving || !selectedMeter || !selectedSite}>
            <Save size={16}/>{saving ? "Saving..." : "Save contract"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [sites, setSites] = useState([]);
  const [meters, setMeters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [contractData, siteData, meterData] = await Promise.all([
        getContracts(), getSites(), getMeters(),
      ]);
      setContracts(contractData);
      setSites(siteData);
      setMeters(meterData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load contracts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      const matched = [
        contract.contractCode, contract.customerName, contract.siteName,
        contract.meterCode, contract.serviceType,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));

      return matched &&
        (filter === "All statuses" || contract.status === filter);
    });
  }, [contracts, search, filter]);

  async function save(payload) {
    setSaving(true);
    setFormError("");

    try {
      let saved;

      if (creating) {
        saved = await createContract(payload);
        setContracts((current) => [saved, ...current]);
        setNotice("Contract created successfully.");
      } else if (editing) {
        saved = await replaceContract(editing.id, payload);
        setContracts((current) => current.map((item) => item.id === saved.id ? saved : item));
        setNotice("Contract updated successfully.");
      }

      setCreating(false);
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to save contract.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(contract, status) {
    if (!status || status === contract.status) return;

    try {
      const updated = await patchContract(contract.id, { status });
      setContracts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`Status updated for ${contract.contractCode}.`);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update contract.");
    }
  }

  async function remove(contract) {
    if (!window.confirm(`Delete contract ${contract.contractCode}? Contracts with invoices cannot be deleted.`)) return;

    try {
      await deleteContract(contract.id);
      setContracts((current) => current.filter((item) => item.id !== contract.id));
      setNotice("Contract deleted successfully.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete contract.");
    }
  }

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONS / SERVICE AGREEMENTS</div>
          <h1>Contracts</h1>
          <p className="page-description">Manage customer agreements and energy service rates.</p>
        </div>
        <div className="page-actions">
          <button className="button button--primary" onClick={() => {
            setEditing(null); setFormError(""); setCreating(true); setNotice("");
          }}>
            <Plus size={17}/> New contract
          </button>
          <button className="button button--secondary" onClick={load} disabled={loading}>
            <RefreshCw size={17} className={loading ? "spin" : ""}/> Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner" role="alert"><p>{error}</p></div>}
      {notice && !error && <div className="notice-banner" role="status"><CheckCircle2 size={18}/>{notice}</div>}

      <section className="site-panel">
        <div className="panel-heading">
          <div><h2>Service contracts</h2><p>One contract connects a customer, site and meter.</p></div>
          <span className="record-count">{contracts.length} contracts</span>
        </div>

        <div className="toolbar">
          <label className="search-box">
            <Search size={18}/>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contract, customer, site or meter..."/>
          </label>
          <label className="filter-box">
            <span className="filter-label">Status</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All statuses</option>
              {STATUSES.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <div className="table-container">
          <table className="sites-table">
            <thead><tr><th>CONTRACT</th><th>CUSTOMER / SITE</th><th>METER / SERVICE</th><th>UNIT RATE</th><th>TERM</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="table-message">Loading contracts...</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} className="table-message">No contracts found. Create a contract to start billing.</td></tr>
              ) : visible.map((contract) => (
                <tr key={contract.id}>
                  <td><div className="site-name-cell"><span className="site-avatar"><FileText size={18}/></span><div><strong>{contract.contractCode}</strong><span>ID: {contract.id}</span></div></div></td>
                  <td><strong>{contract.customerName}</strong><div className="financial-muted">{contract.siteName}</div></td>
                  <td><strong>{contract.meterCode}</strong><div className="financial-muted">{contract.serviceType}</div></td>
                  <td>₹{Number(contract.ratePerUnit).toLocaleString("en-IN", { maximumFractionDigits: 4 })}<div className="financial-muted">per {contract.meterUnit}</div></td>
                  <td>{contract.startDate}<div className="financial-muted">to {contract.endDate || "Ongoing"}</div></td>
                  <td><select className="quick-status-select" value={contract.status} onChange={(e) => changeStatus(contract, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
                  <td><div className="row-actions">
                    <button className="row-action-button" title="Edit contract" onClick={() => { setEditing(contract); setFormError(""); setCreating(false); }}><Pencil size={16}/></button>
                    <button className="row-action-button row-action-button--danger" title="Delete contract" onClick={() => remove(contract)}><Trash2 size={16}/></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing {visible.length} of {contracts.length} contracts</span><span className="footer-note"><span className="online-dot"/> Data from MySQL</span></div>
      </section>

      {(creating || editing) && (
        <ContractModal
          key={creating ? "new-contract" : `edit-${editing.id}`}
          contract={editing}
          meters={meters}
          sites={sites}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={save}
          saving={saving}
          error={formError}
        />
      )}
    </main>
  );
}
