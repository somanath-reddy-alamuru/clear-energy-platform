
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock3,
  Gauge,
  RefreshCw,
  TrendingUp,
  Wrench,
} from "lucide-react";

import {
  getSites,
  getCustomers,
  getMeters,
  getMeterReadings,
} from "../services/sitesApi";

import "../OverviewPage.css";

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });
}

function formatDate(value) {
  if (!value) return "—";

  // Treat MySQL DATETIME values as local display values.
  return String(value)
    .replace("T", " ")
    .slice(0, 16);
}

function ReadingTrendChart({ readings, unit }) {
  const chart = useMemo(() => {
    if (!readings.length) return null;

    const width = 720;
    const height = 270;
    const left = 64;
    const right = 24;
    const top = 24;
    const bottom = 52;

    const values = readings.map((reading) =>
      Number(reading.readingValue)
    );

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const range = maximum - minimum || 1;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const points = readings.map((reading, index) => {
      const x =
        readings.length === 1
          ? left + plotWidth / 2
          : left + (index / (readings.length - 1)) * plotWidth;

      const y =
        top +
        plotHeight -
        ((Number(reading.readingValue) - minimum) / range) * plotHeight;

      return {
        x,
        y,
        value: Number(reading.readingValue),
        date: formatDate(reading.readingAt),
        id: reading.id,
      };
    });

    const labelIndices = [
      ...new Set([
        0,
        Math.floor((points.length - 1) / 2),
        points.length - 1,
      ]),
    ];

    return {
      width,
      height,
      left,
      right,
      top,
      bottom,
      points,
      minimum,
      maximum,
      labelIndices,
      polyline: points.map((point) => `${point.x},${point.y}`).join(" "),
    };
  }, [readings]);

  if (!chart) {
    return (
      <div className="overview-empty">
        <Gauge size={28} />
        <strong>No meter readings available</strong>
        <p>Record at least one reading from Meter Management to display the trend.</p>
      </div>
    );
  }

  const plotHeight = chart.height - chart.top - chart.bottom;

  return (
    <div className="trend-chart-wrap">
      <svg
        className="trend-chart"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label={`Cumulative meter readings in ${unit} over time`}
      >
        {[0, 1, 2, 3].map((line) => {
          const y = chart.top + (plotHeight * line) / 3;
          const value =
            chart.maximum -
            ((chart.maximum - chart.minimum) * line) / 3;

          return (
            <g key={line}>
              <line
                x1={chart.left}
                y1={y}
                x2={chart.width - chart.right}
                y2={y}
                className="trend-grid-line"
              />
              <text
                x={chart.left - 10}
                y={y + 4}
                textAnchor="end"
                className="trend-axis-label"
              >
                {formatNumber(value)}
              </text>
            </g>
          );
        })}

        <polyline
          points={chart.polyline}
          className="trend-line"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {chart.points.map((point) => (
          <circle
            key={point.id}
            cx={point.x}
            cy={point.y}
            r="4.5"
            className="trend-point"
          >
            <title>
              {point.date}: {formatNumber(point.value)} {unit}
            </title>
          </circle>
        ))}

        {chart.labelIndices.map((index) => {
          const point = chart.points[index];

          return (
            <text
              key={`${point.id}-date`}
              x={point.x}
              y={chart.height - 20}
              textAnchor={
                index === 0
                  ? "start"
                  : index === chart.points.length - 1
                    ? "end"
                    : "middle"
              }
              className="trend-axis-label"
            >
              {point.date.slice(0, 10)}
            </text>
          );
        })}
      </svg>

      <div className="chart-legend">
        <span className="chart-legend-dot" />
        Cumulative reading ({unit})
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const [sites, setSites] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [meters, setMeters] = useState([]);
  const [readingsByMeter, setReadingsByMeter] = useState({});

  const [selectedMeterId, setSelectedMeterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [siteData, customerData, meterData] = await Promise.all([
        getSites(),
        getCustomers(),
        getMeters(),
      ]);

      const readingResults = await Promise.all(
        meterData.map(async (meter) => {
          try {
            const result = await getMeterReadings(meter.id);

            return [
              String(meter.id),
              Array.isArray(result.data) ? result.data : [],
            ];
          } catch {
            return [String(meter.id), []];
          }
        })
      );

      setSites(siteData);
      setCustomers(customerData);
      setMeters(meterData);
      setReadingsByMeter(Object.fromEntries(readingResults));

      setSelectedMeterId((current) => {
        if (
          current &&
          meterData.some((meter) => String(meter.id) === current)
        ) {
          return current;
        }

        return meterData.length ? String(meterData[0].id) : "";
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const selectedMeter = useMemo(
    () =>
      meters.find((meter) => String(meter.id) === selectedMeterId) ?? null,
    [meters, selectedMeterId]
  );

  const selectedReadings = useMemo(
    () => readingsByMeter[selectedMeterId] ?? [],
    [readingsByMeter, selectedMeterId]
  );

  const latestConsumption = useMemo(() => {
    if (selectedReadings.length < 2) return null;

    const previous = selectedReadings[selectedReadings.length - 2];
    const latest = selectedReadings[selectedReadings.length - 1];

    return {
      amount: Number(
        (Number(latest.readingValue) - Number(previous.readingValue)).toFixed(3)
      ),
      from: previous.readingAt,
      to: latest.readingAt,
    };
  }, [selectedReadings]);

  const totalReadings = Object.values(readingsByMeter).reduce(
    (count, readings) => count + readings.length,
    0
  );

  const metrics = [
    {
      label: "Industrial sites",
      value: sites.length,
      description: "Registered locations",
      icon: Building2,
      color: "green",
    },
    {
      label: "Customers",
      value: customers.length,
      description: "Registered companies",
      icon: Activity,
      color: "blue",
    },
    {
      label: "Active meters",
      value: meters.filter((meter) => meter.status === "Active").length,
      description: "Available for readings",
      icon: Gauge,
      color: "amber",
    },
    {
      label: "Recorded readings",
      value: totalReadings,
      description: "Across available meters",
      icon: TrendingUp,
      color: "rose",
    },
  ];

  const siteStatusSummary = [
    {
      label: "Active",
      count: sites.filter((site) => site.status === "Active").length,
      icon: CheckCircle2,
      className: "summary-status--active",
    },
    {
      label: "Commissioning",
      count: sites.filter((site) => site.status === "Commissioning").length,
      icon: Clock3,
      className: "summary-status--commissioning",
    },
    {
      label: "Maintenance",
      count: sites.filter((site) => site.status === "Maintenance").length,
      icon: Wrench,
      className: "summary-status--maintenance",
    },
  ];

  return (
    <main className="page-content overview-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERATIONS / OVERVIEW</div>
          <h1>Operations overview</h1>
          <p className="page-description">
            Monitor industrial sites, customers, meters and recorded consumption.
          </p>
        </div>

        <button
          type="button"
          className="button button--secondary"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "spin" : ""}
          />
          {loading ? "Refreshing..." : "Refresh dashboard"}
        </button>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <div>
            <strong>Dashboard data could not be loaded</strong>
            <p>{error}</p>
          </div>

          <button
            type="button"
            className="button button--secondary"
            onClick={loadDashboard}
          >
            Try again
          </button>
        </div>
      )}

      <section className="metrics-grid" aria-label="Operations summary">
        {metrics.map(({ label, value, description, icon: Icon, color }) => (
          <article className="metric-card" key={label}>
            <div className="metric-top">
              <span className="metric-label">{label}</span>
              <span className={`metric-icon metric-icon--${color}`}>
                <Icon size={19} />
              </span>
            </div>

            <div className="metric-value">
              {loading ? "—" : value.toLocaleString()}
            </div>

            <div className="metric-description">{description}</div>
          </article>
        ))}
      </section>

      <section className="overview-content-grid">
        <article className="site-panel overview-trend-panel">
          <div className="panel-heading overview-panel-heading">
            <div>
              <h2>Meter reading trend</h2>
              <p>
                Historical cumulative readings for the selected meter.
              </p>
            </div>

            <label className="overview-meter-picker">
              <span>Meter</span>
              <select
                value={selectedMeterId}
                onChange={(event) => setSelectedMeterId(event.target.value)}
                disabled={meters.length === 0}
                aria-label="Select meter for trend chart"
              >
                {meters.length === 0 && (
                  <option value="">No meters</option>
                )}

                {meters.map((meter) => (
                  <option key={meter.id} value={String(meter.id)}>
                    {meter.meterCode}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="overview-empty">
              <RefreshCw size={22} className="spin" />
              <p>Loading meter history...</p>
            </div>
          ) : (
            <>
              {selectedMeter && (
                <div className="overview-selected-meter">
                  <div className="overview-selected-icon">
                    <Gauge size={19} />
                  </div>
                  <div>
                    <strong>{selectedMeter.meterName}</strong>
                    <span>
                      {selectedMeter.siteName} · {selectedMeter.unit}
                    </span>
                  </div>
                  <span
                    className={`status status--${selectedMeter.status.toLowerCase()}`}
                  >
                    {selectedMeter.status}
                  </span>
                </div>
              )}

              <ReadingTrendChart
                readings={selectedReadings}
                unit={selectedMeter?.unit ?? ""}
              />

              <div className="overview-chart-footer">
                {selectedReadings.length} recorded{" "}
                {selectedReadings.length === 1 ? "reading" : "readings"}
              </div>
            </>
          )}
        </article>

        <article className="site-panel overview-status-panel">
          <div className="panel-heading">
            <div>
              <h2>Site status</h2>
              <p>Current operational overview.</p>
            </div>
            <Building2 size={21} color="#27805A" />
          </div>

          <div className="overview-status-list">
            {siteStatusSummary.map(({ label, count, icon: Icon, className }) => (
              <div className="overview-status-row" key={label}>
                <div className={`overview-status-icon ${className}`}>
                  <Icon size={17} />
                </div>
                <span>{label}</span>
                <strong>{loading ? "—" : count}</strong>
              </div>
            ))}
          </div>

          <div className="overview-status-footer">
            Status counts are calculated from the current site records.
          </div>
        </article>
      </section>

      <section className="site-panel overview-readings-panel">
        <div className="panel-heading">
          <div>
            <h2>Recent meter readings</h2>
            <p>Latest records across the registered meters.</p>
          </div>
          <span className="record-count">{totalReadings} readings</span>
        </div>

        {loading ? (
          <div className="overview-empty">
            <RefreshCw size={22} className="spin" />
            <p>Loading readings...</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="sites-table">
              <thead>
                <tr>
                  <th>METER</th>
                  <th>SITE</th>
                  <th>READING DATE</th>
                  <th>VALUE</th>
                  <th>NOTES</th>
                </tr>
              </thead>

              <tbody>
                {Object.entries(readingsByMeter)
                  .flatMap(([meterId, readings]) => {
                    const meter = meters.find(
                      (item) => String(item.id) === meterId
                    );

                    return readings.map((reading) => ({
                      ...reading,
                      meterCode: meter?.meterCode ?? `Meter ${meterId}`,
                      siteName: meter?.siteName ?? "—",
                      unit: meter?.unit ?? "",
                    }));
                  })
                  .sort((a, b) =>
                    String(b.readingAt).localeCompare(String(a.readingAt))
                  )
                  .slice(0, 8)
                  .map((reading) => (
                    <tr key={`${reading.meterId}-${reading.id}`}>
                      <td>
                        <strong>{reading.meterCode}</strong>
                      </td>
                      <td>{reading.siteName}</td>
                      <td>{formatDate(reading.readingAt)}</td>
                      <td>
                        <strong>{formatNumber(reading.readingValue)}</strong>{" "}
                        {reading.unit}
                      </td>
                      <td>{reading.notes || "—"}</td>
                    </tr>
                  ))}

                {totalReadings === 0 && (
                  <tr>
                    <td colSpan={5} className="table-message">
                      No meter readings have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
