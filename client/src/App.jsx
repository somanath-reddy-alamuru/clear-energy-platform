
import { useState } from "react";

import {
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  FileText,
  Gauge,
  LayoutDashboard,
  Receipt,
  Settings,
  Users,
  Zap,
} from "lucide-react";

import OverviewPage from "./pages/OverviewPage";
import SitesPage from "./pages/SitesPage";
import CustomersPage from "./pages/CustomersPage";
import MeterManagementPage from "./pages/MeterManagementPage";
import ContractsPage from "./pages/ContractsPage";
import BillingPage from "./pages/BillingPage";

import "./App.css";
import "./SiteManagement.css";
import "./CustomerManagement.css";
import "./MeterManagement.css";
import "./FinancialPages.css";

const NAVIGATION = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "sites", label: "Sites", icon: Building2 },
  { id: "customers", label: "Customers", icon: Users },
  { id: "meters", label: "Meter readings", icon: Gauge },
  { id: "contracts", label: "Contracts", icon: FileText },
  { id: "billing", label: "Billing & invoices", icon: Receipt },
];

export default function App() {
  const [activePage, setActivePage] = useState("overview");

  const currentPage =
    NAVIGATION.find((item) => item.id === activePage) ?? NAVIGATION[0];

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
          {NAVIGATION.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;

            return (
              <button
                key={id}
                type="button"
                className={`nav-item ${active ? "nav-item--active" : ""}`}
                onClick={() => setActivePage(id)}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={19} /></div>
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
            <strong>{currentPage.label}</strong>
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

        {activePage === "overview" && <OverviewPage />}
        {activePage === "sites" && <SitesPage />}
        {activePage === "customers" && <CustomersPage />}
        {activePage === "meters" && <MeterManagementPage />}
        {activePage === "contracts" && <ContractsPage />}
        {activePage === "billing" && <BillingPage />}
      </div>
    </div>
  );
}
