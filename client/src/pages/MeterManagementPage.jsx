
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  Calculator,
  CheckCircle2,
  Clock3,
  Gauge,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import {
  getSites,
  getMeters,
  createMeter,
  replaceMeter,
  patchMeter,
  deleteMeter,
  getMeterReadings,
  createMeterReading,
  getMeterConsumption,
} from "../services/sitesApi";

const METER_TYPES = ["Steam", "Thermal Energy", "Bulk LPG"];
const METER_STATUSES = ["Active", "Maintenance", "Inactive"];

const UNITS_BY_TYPE = {
  Steam: ["kg", "tonnes"],
  "Thermal Energy": ["kWh"],
  "Bulk LPG": ["kg", "tonnes", "m3"],
};

const DEFAULT_UNITS = {
  Steam: "tonnes",
  "Thermal Energy": "kWh",
  "Bulk LPG": "tonnes",
};

function localDateTime(value = new Date()) {
  const pad = (number) => String(number).padStart(2, "0");

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
  )}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function toDateTimeInput(value) {
  if (!value) return "";
  return String(value).replace(" ", "T").slice(0, 16);
}

function Modal({ children, onClose, busy = false }) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      {children}
    </div>
  );
}

function MeterFormModal({
  mode,
  meter,
  sites,
  onClose,
  onSave,
  saving,
  error,
}) {
  const [form, setForm] = useState(() => ({
    siteId: meter?.siteId ? String(meter.siteId) : "",
    meterCode: meter?.meterCode ?? "",
    meterName: meter?.meterName ?? "",
    meterType: meter?.meterType ?? "Steam",
    unit: meter?.unit ?? "tonnes",
    status: meter?.status ?? "Active",
  }));

  function changeField(event) {
    const { name, value } = event.target;

    if (name === "siteId") {
      const selectedSite = sites.find(
        (site) => String(site.id) === value
      );

      const newType = selectedSite?.serviceType ?? "Steam";

      setForm((current) => ({
        ...current,
        siteId: value,
        meterType: newType,
        unit: DEFAULT_UNITS[newType],
      }));

      return;
    }

    if (name === "meterType") {
      setForm((current) => ({
        ...current,
        meterType: value,
        unit: DEFAULT_UNITS[value],
      }));

      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function submit(event) {
    event.preventDefault();

    await onSave({
      ...form,
      siteId: Number(form.siteId),
    });
  }

  return (
    <Modal onClose={onClose} busy={saving}>
      <form className="modal-card" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">METER MANAGEMENT</p>
            <h2>{mode === "edit" ? "Edit meter" : "Register meter"}</h2>
            <p className="modal-description">
              Assign a meter to a site and specify its measurement unit.
            </p>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close form"
          >
            <X size={19} />
          </button>
        </div>

        <div className="form-grid">
          <label className="form-field form-field--full">
            Industrial site
            <select
              name="siteId"
              value={form.siteId}
              onChange={changeField}
              required
            >
              <option value="" disabled>Select a site</option>
              {sites.map((site) => (
                <option key={site.id} value={String(site.id)}>
                  {site.name} — {site.serviceType}
                </option>
              ))}
            </select>
          </label>

          <label className="form-field">
            Meter code
            <input
              name="meterCode"
              value={form.meterCode}
              onChange={changeField}
              placeholder="MTR-HP-002"
              maxLength={60}
              required
            />
          </label>

          <label className="form-field">
            Meter name
            <input
              name="meterName"
              value={form.meterName}
              onChange={changeField}
              placeholder="Secondary Steam Meter"
              maxLength={120}
              required
            />
          </label>

          <label className="form-field">
            Meter type
            <select
              name="meterType"
              value={form.meterType}
              onChange={changeField}
              required
            >
              {METER_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            Measurement unit
            <select
              name="unit"
              value={form.unit}
              onChange={changeField}
              required
            >
              {(UNITS_BY_TYPE[form.meterType] ?? []).map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </label>

          <label className="form-field">
            Meter status
            <select
              name="status"
              value={form.status}
              onChange={changeField}
              required
            >
              {METER_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <div className="modal-error" role="alert">{error}</div>}

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
            disabled={saving || sites.length === 0}
          >
            <Save size={16} />
            {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Register meter"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MeterStatus({ status }) {
  return (
    <span className={`status status--${status.toLowerCase()}`}>
      {status}
    </span>
  );
}

export default function MeterManagementPage() {
  const [meters, setMeters] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");

  const [modalMode, setModalMode] = useState(null);
  const [editingMeter, setEditingMeter] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [selectedMeterId, setSelectedMeterId] = useState("");
  const [readings, setReadings] = useState([]);
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingError, setReadingError] = useState("");
  const [readingNotice, setReadingNotice] = useState("");

  const [showReadingForm, setShowReadingForm] = useState(false);
  const [readingValue, setReadingValue] = useState("");
  const [readingAt, setReadingAt] = useState(() => localDateTime());
  const [readingNotes, setReadingNotes] = useState("");
  const [savingReading, setSavingReading] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [consumption, setConsumption] = useState(null);
  const [consumptionError, setConsumptionError] = useState("");
  const [calculating, setCalculating] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [meterData, siteData] = await Promise.all([
        getMeters(),
        getSites(),
      ]);

      setMeters(meterData);
      setSites(siteData);

      setSelectedMeterId((current) => {
        if (current && meterData.some((meter) => String(meter.id) === current)) {
          return current;
        }

        return meterData.length ? String(meterData[0].id) : "";
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load meters and sites."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const selectedMeter = useMemo(
    () => meters.find((meter) => String(meter.id) === selectedMeterId) ?? null,
    [meters, selectedMeterId]
  );

  const filteredMeters = useMemo(() => {
    const query = search.trim().toLowerCase();

    return meters.filter((meter) => {
      const matchesSearch = [
        meter.meterCode,
        meter.meterName,
        meter.siteName,
        meter.meterType,
      ].some((value) => String(value ?? "").toLowerCase().includes(query));

      return (
        matchesSearch &&
        (statusFilter === "All statuses" || meter.status === statusFilter)
      );
    });
  }, [meters, search, statusFilter]);

  const metrics = [
    {
      label: "Total meters",
      value: meters.length,
      description: "Registered meters",
      icon: Gauge,
      color: "green",
    },
    {
      label: "Active meters",
      value: meters.filter((meter) => meter.status === "Active").length,
      description: "Available for readings",
      icon: Activity,
      color: "blue",
    },
    {
      label: "Sites monitored",
      value: new Set(meters.map((meter) => meter.siteId)).size,
      description: "Sites with meters",
      icon: Building2,
      color: "amber",
    },
    {
      label: "Needs attention",
      value: meters.filter((meter) => meter.status === "Maintenance").length,
      description: "Meters under maintenance",
      icon: Clock3,
      color: "rose",
    },
  ];

  const loadReadings = useCallback(async (meterId) => {
    if (!meterId) {
      setReadings([]);
      return;
    }

    setReadingLoading(true);
    setReadingError("");
    setConsumption(null);
    setConsumptionError("");

    try {
      const result = await getMeterReadings(meterId);
      const data = result.data ?? [];

      setReadings(data);

      if (data.length >= 2) {
        setFrom((current) => current || toDateTimeInput(data[0].readingAt));
        setTo((current) => current || toDateTimeInput(data[data.length - 1].readingAt));
      }
    } catch (err) {
      setReadingError(
        err instanceof Error ? err.message : "Unable to load reading history."
      );
      setReadings([]);
    } finally {
      setReadingLoading(false);
    }
  }, []);

  useEffect(() => {
    setFrom("");
    setTo("");
    setConsumption(null);
    setReadingNotice("");
    loadReadings(selectedMeterId);
  }, [selectedMeterId, loadReadings]);

  function openCreate() {
    setEditingMeter(null);
    setFormError("");
    setNotice("");
    setModalMode("create");
  }

  function openEdit(meter) {
    setEditingMeter(meter);
    setFormError("");
    setNotice("");
    setModalMode("edit");
  }

  async function saveMeter(formData) {
    setSaving(true);
    setFormError("");

    try {
      if (modalMode === "create") {
        const created = await createMeter(formData);
        setMeters((current) => [...current, created]);
        setSelectedMeterId(String(created.id));
        setNotice("Meter registered successfully.");
      } else if (editingMeter) {
        const updated = await replaceMeter(editingMeter.id, formData);

        setMeters((current) =>
          current.map((meter) => meter.id === updated.id ? updated : meter)
        );

        setNotice("Meter details updated successfully.");
      }

      setModalMode(null);
      setEditingMeter(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save the meter."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeMeterStatus(meter, status) {
    if (!status || status === meter.status) return;

    setError("");
    setNotice("");

    try {
      const updated = await patchMeter(meter.id, { status });

      setMeters((current) =>
        current.map((item) => item.id === updated.id ? updated : item)
      );

      setNotice(`Status updated for ${meter.meterCode}.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update meter status."
      );
    }
  }

  async function removeMeter() {
    if (!deleteCandidate) return;

    setDeletingId(deleteCandidate.id);
    setDeleteError("");

    try {
      await deleteMeter(deleteCandidate.id);

      setMeters((current) =>
        current.filter((meter) => meter.id !== deleteCandidate.id)
      );

      if (selectedMeterId === String(deleteCandidate.id)) {
        setSelectedMeterId("");
      }

      setDeleteCandidate(null);
      setNotice("Meter deleted successfully.");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete the meter."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function recordReading(event) {
    event.preventDefault();

    if (!selectedMeter) return;

    setSavingReading(true);
    setReadingError("");
    setReadingNotice("");

    try {
      await createMeterReading(selectedMeter.id, {
        readingValue: Number(readingValue),
        readingAt,
        notes: readingNotes,
      });

      setReadingValue("");
      setReadingNotes("");
      setReadingAt(localDateTime());
      setShowReadingForm(false);
      setReadingNotice("Meter reading recorded successfully.");

      await loadReadings(String(selectedMeter.id));
    } catch (err) {
      setReadingError(
        err instanceof Error ? err.message : "Unable to record reading."
      );
    } finally {
      setSavingReading(false);
    }
  }

  async function calculateSelectedConsumption(event) {
    event.preventDefault();

    if (!selectedMeter || !from || !to) {
      setConsumptionError("Select both a start and end date and time.");
      return;
    }

    setCalculating(true);
    setConsumptionError("");
    setConsumption(null);

    try {
      const result = await getMeterConsumption(selectedMeter.id, from, to);
      setConsumption(result);
    } catch (err) {
      setConsumptionError(
        err instanceof Error
          ? err.message
          : "Unable to calculate consumption."
      );
    } finally {
      setCalculating(false);
    }
  }

  return (
    <main className="page-content">
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONS / METER MONITORING</div>
          <h1>Meter management</h1>
          <p className="page-description">
            Register meters, record cumulative readings and calculate site consumption.
          </p>
        </div>

        <div className="page-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={openCreate}
            disabled={sites.length === 0}
          >
            <Plus size={17} /> Register meter
          </button>

          <button
            type="button"
            className="button button--secondary"
            onClick={loadAll}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin" : ""} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>Unable to load or update meters</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="button button--secondary"
            onClick={loadAll}
          >
            Try again
          </button>
        </div>
      )}

      {notice && !error && (
        <div className="notice-banner" role="status">
          <CheckCircle2 size={18} /> {notice}
        </div>
      )}

      <section className="metrics-grid" aria-label="Meter summary">
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
            <h2>Registered meters</h2>
            <p>Select a meter to inspect its history and usage.</p>
          </div>
          <span className="record-count">
            {meters.length} {meters.length === 1 ? "meter" : "meters"}
          </span>
        </div>

        <div className="toolbar">
          <label className="search-box">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search meter code, name or site..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search meters"
            />
          </label>

          <label className="filter-box">
            <span className="filter-label">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option>All statuses</option>
              {METER_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="table-container">
          <table className="sites-table">
            <thead>
              <tr>
                <th>METER</th>
                <th>INDUSTRIAL SITE</th>
                <th>TYPE</th>
                <th>UNIT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-message">
                    <RefreshCw size={20} className="spin" /> Loading meters...
                  </td>
                </tr>
              ) : filteredMeters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-message">
                    No meters match your search or status filter.
                  </td>
                </tr>
              ) : (
                filteredMeters.map((meter) => (
                  <tr
                    key={meter.id}
                    className={
                      String(meter.id) === selectedMeterId
                        ? "meter-row--selected"
                        : ""
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className="meter-select-button"
                        onClick={() => setSelectedMeterId(String(meter.id))}
                      >
                        <span className="site-avatar"><Gauge size={18} /></span>
                        <span>
                          <strong>{meter.meterName}</strong>
                          <small>{meter.meterCode}</small>
                        </span>
                      </button>
                    </td>
                    <td>{meter.siteName}</td>
                    <td>{meter.meterType}</td>
                    <td><span className="service-type">{meter.unit}</span></td>
                    <td><MeterStatus status={meter.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="row-action-button"
                          title="Edit meter"
                          aria-label={`Edit ${meter.meterCode}`}
                          onClick={() => openEdit(meter)}
                        >
                          <span className="meter-pencil">✎</span>
                        </button>

                        <select
                          className="quick-status-select"
                          aria-label={`Change status for ${meter.meterCode}`}
                          value=""
                          onChange={(event) => changeMeterStatus(meter, event.target.value)}
                        >
                          <option value="" disabled>Status</option>
                          {METER_STATUSES.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="row-action-button row-action-button--danger"
                          title="Delete meter"
                          aria-label={`Delete ${meter.meterCode}`}
                          onClick={() => {
                            setDeleteCandidate(meter);
                            setDeleteError("");
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
          <span>Showing {filteredMeters.length} of {meters.length} meters</span>
          <span className="footer-note">
            <span className="online-dot" /> Meter data from MySQL
          </span>
        </div>
      </section>

      <section className="meter-detail-grid">
        <section className="site-panel meter-detail-panel">
          <div className="panel-heading">
            <div>
              <h2>Reading history</h2>
              <p>
                {selectedMeter
                  ? `${selectedMeter.meterCode} · ${selectedMeter.unit}`
                  : "Select a meter to view readings."}
              </p>
            </div>

            <button
              type="button"
              className="button button--secondary"
              disabled={!selectedMeter || selectedMeter.status !== "Active"}
              onClick={() => {
                setReadingError("");
                setReadingNotice("");
                setShowReadingForm((current) => !current);
              }}
            >
              <Plus size={16} /> Record reading
            </button>
          </div>

          {readingError && (
            <div className="meter-inline-error" role="alert">{readingError}</div>
          )}

          {readingNotice && !readingError && (
            <div className="meter-inline-success" role="status">
              <CheckCircle2 size={16} /> {readingNotice}
            </div>
          )}

          {showReadingForm && selectedMeter && (
            <form className="reading-form" onSubmit={recordReading}>
              <label className="form-field">
                Cumulative reading ({selectedMeter.unit})
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  required
                  value={readingValue}
                  onChange={(event) => setReadingValue(event.target.value)}
                  placeholder="e.g. 133.000"
                />
              </label>

              <label className="form-field">
                Reading date and time
                <input
                  type="datetime-local"
                  required
                  value={readingAt}
                  onChange={(event) => setReadingAt(event.target.value)}
                />
              </label>

              <label className="form-field">
                Notes (optional)
                <input
                  value={readingNotes}
                  maxLength={255}
                  onChange={(event) => setReadingNotes(event.target.value)}
                  placeholder="e.g. Manual operator reading"
                />
              </label>

              <div className="reading-form-actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setShowReadingForm(false)}
                  disabled={savingReading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button--primary"
                  disabled={savingReading}
                >
                  <Save size={16} />
                  {savingReading ? "Saving..." : "Save reading"}
                </button>
              </div>
            </form>
          )}

          {readingLoading ? (
            <div className="table-message">
              <RefreshCw size={19} className="spin" /> Loading readings...
            </div>
          ) : readings.length === 0 ? (
            <div className="meter-empty-state">
              <Gauge size={28} />
              <strong>No readings yet</strong>
              <p>Record a cumulative meter reading to start tracking usage.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="sites-table">
                <thead>
                  <tr>
                    <th>DATE AND TIME</th>
                    <th>READING</th>
                    <th>NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id}>
                      <td>{String(reading.readingAt).replace("T", " ")}</td>
                      <td>
                        <strong>{Number(reading.readingValue).toLocaleString()}</strong>{" "}
                        {selectedMeter?.unit}
                      </td>
                      <td>{reading.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="site-panel meter-detail-panel">
          <div className="panel-heading">
            <div>
              <h2>Consumption analysis</h2>
              <p>Compare cumulative readings over a selected period.</p>
            </div>
            <Calculator size={22} color="#27805A" />
          </div>

          {selectedMeter ? (
            <>
              <form
                className="consumption-form"
                onSubmit={calculateSelectedConsumption}
              >
                <label className="form-field">
                  Period start
                  <input
                    type="datetime-local"
                    required
                    value={from}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </label>

                <label className="form-field">
                  Period end
                  <input
                    type="datetime-local"
                    required
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </label>

                <button
                  type="submit"
                  className="button button--primary"
                  disabled={calculating || readings.length < 2}
                >
                  <Calculator size={16} />
                  {calculating ? "Calculating..." : "Calculate consumption"}
                </button>
              </form>

              {consumptionError && (
                <div className="meter-inline-error" role="alert">
                  {consumptionError}
                </div>
              )}

              {consumption && (
                <div className="consumption-result">
                  <span className="consumption-result-label">
                    Calculated consumption
                  </span>
                  <strong>
                    {Number(consumption.consumption).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 3 }
                    )}
                  </strong>
                  <span className="consumption-unit">{consumption.unit}</span>

                  <div className="consumption-breakdown">
                    <div>
                      <span>Start reading</span>
                      <strong>
                        {Number(consumption.startReading.readingValue).toLocaleString()}
                      </strong>
                    </div>
                    <div>
                      <span>End reading</span>
                      <strong>
                        {Number(consumption.endReading.readingValue).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {!consumption && !consumptionError && readings.length < 2 && (
                <div className="meter-empty-state meter-empty-state--compact">
                  <p>At least two readings are needed to calculate consumption.</p>
                </div>
              )}
            </>
          ) : (
            <div className="meter-empty-state">
              <Calculator size={28} />
              <strong>Select a meter</strong>
              <p>Select a registered meter to analyse consumption.</p>
            </div>
          )}
        </section>
      </section>

      {modalMode && (
        <MeterFormModal
          key={`${modalMode}-${editingMeter?.id ?? "new"}`}
          mode={modalMode}
          meter={editingMeter}
          sites={sites}
          saving={saving}
          error={formError}
          onClose={() => {
            if (saving) return;
            setModalMode(null);
            setEditingMeter(null);
            setFormError("");
          }}
          onSave={saveMeter}
        />
      )}

      {deleteCandidate && (
        <Modal
          onClose={() => {
            if (deletingId === null) {
              setDeleteCandidate(null);
              setDeleteError("");
            }
          }}
          busy={deletingId !== null}
        >
          <div
            className="modal-card modal-card--small"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-meter-title"
          >
            <div className="delete-icon"><Trash2 size={23} /></div>
            <h2 id="delete-meter-title">Delete meter?</h2>
            <p className="modal-description">
              Delete <strong>{deleteCandidate.meterCode}</strong>? Meters with
              recorded readings cannot be deleted.
            </p>

            {deleteError && (
              <div className="modal-error" role="alert">{deleteError}</div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={deletingId !== null}
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="button button--danger"
                disabled={deletingId !== null}
                onClick={removeMeter}
              >
                <Trash2 size={16} />
                {deletingId !== null ? "Deleting..." : "Delete meter"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}
