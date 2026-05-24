import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  CreditCard,
  FileCheck2,
  Gauge,
  GitBranch,
  History,
  Layers3,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  MessageCircle,
  Radar,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  TimerReset,
  TrendingUp,
  UsersRound,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth/AuthContext";
import { supportMailto } from "../../lib/support/contact";
import "./LandingPage.css";

type IconCard = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const logoNames = [
  "Northstar Fitness",
  "Pulse Studio",
  "Apex Academy",
  "Renew Wellness",
  "Signal Club",
  "Forge Collective",
];

const metrics = [
  { label: "Revenue recovered", value: "$248k" },
  { label: "Recovery rate", value: "38%" },
  { label: "Admin hours saved", value: "420+" },
  { label: "Renewal lift", value: "21%" },
];

const problems: IconCard[] = [
  {
    icon: AlertTriangle,
    title: "Missed renewals hide in plain sight",
    description:
      "Expiring members drift from active to overdue without a clear owner, priority, or revenue signal.",
  },
  {
    icon: MessageCircle,
    title: "Follow-up lives across scattered tools",
    description:
      "Staff juggle spreadsheets, chats, screenshots, and memory instead of one recovery queue.",
  },
  {
    icon: BarChart3,
    title: "Revenue visibility arrives too late",
    description:
      "Owners learn about leakage after cash flow drops, not when it can still be recovered.",
  },
  {
    icon: TimerReset,
    title: "Manual tracking burns operator time",
    description:
      "Renewal work becomes a daily reconciliation chore with no auditable handoff trail.",
  },
];

const workflowSteps = [
  {
    icon: Radar,
    title: "Detect",
    detail: "Monitor expiring, overdue, and at-risk memberships automatically.",
  },
  {
    icon: Workflow,
    title: "Trigger",
    detail: "Start recovery sequences with reminders, tasks, and queue routing.",
  },
  {
    icon: CreditCard,
    title: "Verify",
    detail: "Approve payments and connect recovery outcomes to member records.",
  },
  {
    icon: TrendingUp,
    title: "Recover",
    detail: "Track recovered revenue, conversion, and team throughput in real time.",
  },
];

const features: IconCard[] = [
  {
    icon: BellRing,
    title: "Automated reminder workflows",
    description: "Sequence renewal nudges by state, plan value, and recovery stage.",
  },
  {
    icon: Gauge,
    title: "Revenue-at-risk dashboard",
    description: "See overdue value, expiring revenue, recovery rate, and open work.",
  },
  {
    icon: FileCheck2,
    title: "Payment verification",
    description: "Review payment submissions with clear approval and rejection paths.",
  },
  {
    icon: ListChecks,
    title: "Recovery queue",
    description: "Prioritize member outreach by urgency, value, and next action.",
  },
  {
    icon: UsersRound,
    title: "Member lifecycle tracking",
    description: "Follow every member from active to expiring, overdue, recovered, or churned.",
  },
  {
    icon: ClipboardCheck,
    title: "Operational task management",
    description: "Assign revenue recovery work without losing context or ownership.",
  },
  {
    icon: History,
    title: "Audit timeline",
    description: "Preserve a clean record of reminders, payments, approvals, and tasks.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp-ready recovery",
    description:
      "Design pilot recovery flows for WhatsApp handoffs before live messaging integration.",
  },
];

const howItWorks = [
  {
    icon: Layers3,
    title: "Import Members",
    description:
      "Bring in names, contacts, plans, expiry dates, and values so IronCore can classify revenue risk.",
  },
  {
    icon: Zap,
    title: "Automate Recovery",
    description:
      "Turn overdue and expiring members into sequenced tasks, reminders, and payment checks.",
  },
  {
    icon: CircleDollarSign,
    title: "Recover Revenue",
    description:
      "Verify payments, update recovery status, and measure the value returned to the business.",
  },
];

const testimonials = [
  {
    quote:
      "IronCore made missed renewals visible before they became churn. Our front desk finally has a clean queue instead of five separate spreadsheets.",
    name: "Maya Reynolds",
    title: "Owner, PeakLine Training",
  },
  {
    quote:
      "We recovered more overdue revenue in the first month because every follow-up had an owner, a status, and a next step.",
    name: "Daniel Okafor",
    title: "Director, Forte Martial Arts",
  },
  {
    quote:
      "The dashboard gives me the operating rhythm I wanted: what is at risk, who is handling it, and what has actually been recovered.",
    name: "Priya Shah",
    title: "Founder, Balance Studio Network",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$149",
    description: "For lean teams proving a cleaner renewal motion.",
    features: [
      "Up to 500 active members",
      "Revenue-at-risk dashboard",
      "Recovery queue",
      "Payment verification",
    ],
  },
  {
    name: "Growth",
    price: "$349",
    description: "For operators managing recovery across a larger book.",
    featured: true,
    features: [
      "Up to 2,500 active members",
      "Workflow automation",
      "Task ownership and audit timeline",
      "Weekly recovery reporting",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For multi-location teams with advanced controls.",
    features: [
      "Multi-site operating views",
      "Custom recovery workflows",
      "Admin controls and support",
      "Pilot success planning",
    ],
  },
];

const recoveryRows = [
  ["Aisha Bello", "Premium annual", "$720", "Payment review"],
  ["James Wright", "Family monthly", "$180", "Follow-up due"],
  ["Lena Martins", "Coaching cohort", "$460", "Reminder sent"],
  ["Omar Hassan", "Studio unlimited", "$240", "Recovered"],
];

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="landing-section-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function ProductDashboardMockup() {
  return (
    <div className="landing-dashboard-shell" aria-label="IronCore dashboard preview">
      <div className="landing-dashboard-topbar">
        <div>
          <span className="landing-window-dot" />
          <span className="landing-window-dot" />
          <span className="landing-window-dot" />
        </div>
        <span>Revenue Recovery Command Center</span>
        <BadgeCheck size={16} aria-hidden="true" />
      </div>

      <div className="landing-dashboard-grid">
        <aside className="landing-dashboard-sidebar">
          <div className="landing-sidebar-brand">
            <span>IC</span>
            <strong>Retain</strong>
          </div>
          {[
            ["Dashboard", LayoutDashboard],
            ["Recovery Queue", ListChecks],
            ["Payments", CreditCard],
            ["Workflows", GitBranch],
          ].map(([label, Icon]) => {
            const NavIcon = Icon as LucideIcon;

            return (
              <div
                className={`landing-sidebar-item ${
                  label === "Dashboard" ? "active" : ""
                }`}
                key={label as string}
              >
                <NavIcon size={15} aria-hidden="true" />
                <span>{label as string}</span>
              </div>
            );
          })}
        </aside>

        <main className="landing-dashboard-main">
          <div className="landing-dashboard-heading">
            <div>
              <span>Last 30 days</span>
              <h3>Revenue Operations</h3>
            </div>
            <button type="button">
              <Sparkles size={14} aria-hidden="true" />
              Auto-prioritize
            </button>
          </div>

          <div className="landing-kpi-row">
            <article>
              <span>Revenue at risk</span>
              <strong>$41,820</strong>
              <small>28 overdue accounts</small>
            </article>
            <article>
              <span>Recovered</span>
              <strong>$18,460</strong>
              <small>+31% this cycle</small>
            </article>
            <article>
              <span>Recovery rate</span>
              <strong>42.8%</strong>
              <small>9.4 pts above target</small>
            </article>
          </div>

          <div className="landing-dashboard-panels">
            <section className="landing-chart-card">
              <div className="landing-panel-title">
                <strong>Recovery performance</strong>
                <span>Live workflow activity</span>
              </div>
              <div className="landing-chart">
                <span style={{ height: "42%" }} />
                <span style={{ height: "58%" }} />
                <span style={{ height: "36%" }} />
                <span style={{ height: "68%" }} />
                <span style={{ height: "78%" }} />
                <span style={{ height: "62%" }} />
                <span style={{ height: "86%" }} />
                <span style={{ height: "74%" }} />
              </div>
            </section>

            <section className="landing-activity-card">
              <div className="landing-panel-title">
                <strong>Workflow activity</strong>
                <span>12 actions today</span>
              </div>
              {[
                ["Reminder queued", "18 expiring members", "now"],
                ["Payment verified", "$720 recovered", "7m"],
                ["Task assigned", "High-value renewal", "19m"],
              ].map(([title, detail, time]) => (
                <div className="landing-activity-row" key={title}>
                  <span />
                  <div>
                    <strong>{title}</strong>
                    <small>{detail}</small>
                  </div>
                  <time>{time}</time>
                </div>
              ))}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function OperationsPreview() {
  return (
    <div className="landing-ops-preview">
      <div className="landing-ops-header">
        <div>
          <span>Operations cockpit</span>
          <h3>Everything overdue revenue needs in one view.</h3>
        </div>
        <div className="landing-health-pill">
          <Activity size={15} aria-hidden="true" />
          Live recovery pulse
        </div>
      </div>

      <div className="landing-ops-grid">
        <section className="landing-risk-panel">
          <div className="landing-panel-title">
            <strong>Revenue at risk</strong>
            <span>By recovery stage</span>
          </div>
          <div className="landing-risk-chart" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="landing-risk-legend">
            <span>Expiring soon</span>
            <strong>$12.4k</strong>
            <span>Overdue</span>
            <strong>$29.1k</strong>
            <span>Pending verification</span>
            <strong>$8.7k</strong>
          </div>
        </section>

        <section className="landing-table-panel">
          <div className="landing-panel-title">
            <strong>Recovery queue</strong>
            <span>Prioritized by value and due date</span>
          </div>
          <div className="landing-recovery-table">
            {recoveryRows.map(([name, plan, amount, status]) => (
              <div className="landing-recovery-row" key={name}>
                <div>
                  <strong>{name}</strong>
                  <span>{plan}</span>
                </div>
                <b>{amount}</b>
                <small>{status}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-task-panel">
          <div className="landing-panel-title">
            <strong>Task queue</strong>
            <span>Team handoffs</span>
          </div>
          {[
            ["Verify bank transfer", "4 payments waiting"],
            ["Call high-value overdue members", "$6.8k at risk"],
            ["Review rejected proof", "2 tasks due"],
          ].map(([title, detail]) => (
            <div className="landing-task-row" key={title}>
              <CheckCircle2 size={16} aria-hidden="true" />
              <div>
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export function LandingPage() {
  const auth = useAuth();
  const primaryCta =
    auth.isAuthenticated && !auth.onboardingRequired ? "/dashboard" : "/signup";
  const primaryLabel =
    auth.isAuthenticated && !auth.onboardingRequired
      ? "Open Dashboard"
      : "Start Free Trial";
  const demoMailto = `${supportMailto}?subject=Book%20an%20IronCore%20Retain%20demo`;

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Landing navigation">
        <Link className="landing-brand" to="/">
          <span>IC</span>
          <strong>IronCore Retain</strong>
        </Link>
        <div className="landing-nav-links">
          <a href="#workflow">Workflow</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link to="/login">Sign in</Link>
        </div>
        <Link className="landing-nav-cta" to={primaryCta}>
          {primaryLabel}
        </Link>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Revenue recovery operations for membership businesses
          </span>
          <h1>Stop Losing Members to Missed Renewals</h1>
          <p>
            IronCore Retain detects recurring revenue leakage, coordinates
            recovery workflows, verifies payments, and shows operators exactly
            how much overdue revenue came back.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-button landing-button-primary" to={primaryCta}>
              {primaryLabel}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a className="landing-button landing-button-secondary" href={demoMailto}>
              Book Demo
              <ChevronRight size={18} aria-hidden="true" />
            </a>
          </div>
          <div className="landing-hero-proof">
            <span>
              <ShieldCheck size={16} aria-hidden="true" />
              Built for recovery visibility
            </span>
            <span>
              <LockKeyhole size={16} aria-hidden="true" />
              Pilot-ready operating controls
            </span>
          </div>
        </div>
        <div className="landing-hero-product">
          <ProductDashboardMockup />
        </div>
      </section>

      <section className="landing-trust" aria-label="Social proof">
        <p>Trusted by operators running recurring membership revenue</p>
        <div className="landing-logo-strip">
          {logoNames.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>
        <div className="landing-metric-strip">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="problem">
        <SectionHeader
          eyebrow="The leakage problem"
          title="Revenue recovery breaks when renewal work is invisible."
          description="Membership teams do not lose revenue because they lack effort. They lose it because overdue work lacks a system of record."
        />
        <div className="landing-card-grid landing-problem-grid">
          {problems.map((problem) => (
            <article className="landing-card landing-problem-card" key={problem.title}>
              <problem.icon size={22} aria-hidden="true" />
              <h3>{problem.title}</h3>
              <p>{problem.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-workflow-section" id="workflow">
        <SectionHeader
          eyebrow="Operational recovery loop"
          title="Detect leakage, run workflows, verify payment, prove recovery."
          description="IronCore turns renewal risk into an accountable operating motion your staff can run every day."
        />
        <div className="landing-workflow">
          {workflowSteps.map((step, index) => (
            <article className="landing-workflow-step" key={step.title}>
              <div className="landing-workflow-index">
                <step.icon size={20} aria-hidden="true" />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="features">
        <SectionHeader
          eyebrow="Platform capabilities"
          title="A modern command layer for retention operations."
          description="Workflow automation, payment review, recovery queues, and revenue intelligence live together in one operational workspace."
        />
        <div className="landing-card-grid landing-feature-grid">
          {features.map((feature) => (
            <article className="landing-card landing-feature-card" key={feature.title}>
              <span className="landing-feature-icon">
                <feature.icon size={21} aria-hidden="true" />
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-dashboard-preview-section">
        <SectionHeader
          eyebrow="Dashboard preview"
          title="Real B2B operations, not a fitness website."
          description="Operators see value at risk, overdue members, recovered revenue, workflow activity, tasks, and audit history in a single admin-grade surface."
        />
        <OperationsPreview />
      </section>

      <section className="landing-section landing-how-section" id="how-it-works">
        <SectionHeader
          eyebrow="How it works"
          title="Go from member file to recovered revenue."
          description="IronCore keeps the first-value path intentionally direct for teams proving their recovery loop."
        />
        <div className="landing-how-grid">
          {howItWorks.map((item, index) => (
            <article className="landing-how-card" key={item.title}>
              <span className="landing-how-number">{index + 1}</span>
              <item.icon size={24} aria-hidden="true" />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section landing-testimonials">
        <SectionHeader
          eyebrow="Operator proof"
          title="Built for owners who need measurable recovery."
          description="IronCore gives revenue teams the same clarity modern SaaS companies expect from their internal operating systems."
        />
        <div className="landing-testimonial-grid">
          {testimonials.map((testimonial) => (
            <article className="landing-testimonial" key={testimonial.name}>
              <p>&quot;{testimonial.quote}&quot;</p>
              <div>
                <strong>{testimonial.name}</strong>
                <span>{testimonial.title}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="pricing">
        <SectionHeader
          eyebrow="Pricing"
          title="Start with the recovery motion you need now."
          description="Simple pilot-friendly plans for teams moving from manual follow-up to accountable revenue recovery."
        />
        <div className="landing-pricing-grid">
          {pricing.map((plan) => (
            <article
              className={`landing-pricing-card ${plan.featured ? "featured" : ""}`}
              key={plan.name}
            >
              {plan.featured ? <span className="landing-plan-badge">Most popular</span> : null}
              <h3>{plan.name}</h3>
              <div className="landing-price">
                <strong>{plan.price}</strong>
                {plan.price !== "Custom" ? <span>/mo</span> : null}
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.name === "Enterprise" ? (
                <a
                  className="landing-button landing-button-secondary"
                  href={demoMailto}
                >
                  Contact Sales
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              ) : (
                <Link
                  className={`landing-button ${
                    plan.featured
                      ? "landing-button-primary"
                      : "landing-button-secondary"
                  }`}
                  to={primaryCta}
                >
                  Start Free Trial
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <span className="landing-eyebrow">
            <SearchCheck size={16} aria-hidden="true" />
            Find the leakage before it becomes churn
          </span>
          <h2>Recover overdue revenue with a system your team can run daily.</h2>
          <p>
            Replace scattered renewal follow-up with a focused operating layer
            for at-risk revenue, payment verification, and measurable recovery.
          </p>
        </div>
        <div className="landing-final-actions">
          <Link className="landing-button landing-button-primary" to={primaryCta}>
            {primaryLabel}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <a className="landing-button landing-button-secondary" href={demoMailto}>
            Book Demo
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <Link className="landing-brand" to="/">
            <span>IC</span>
            <strong>IronCore Retain</strong>
          </Link>
          <p>Recurring revenue recovery for membership operators.</p>
        </div>
        <nav aria-label="Product links">
          <strong>Product</strong>
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <nav aria-label="Company links">
          <strong>Company</strong>
          <Link to="/login">Sign in</Link>
          <a href={demoMailto}>Book demo</a>
          <a href={supportMailto}>Contact</a>
        </nav>
        <nav aria-label="Legal links">
          <strong>Legal</strong>
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#security">Security</a>
        </nav>
        <div className="landing-footer-bottom">
          <span>Copyright 2026 IronCore Retain</span>
          <div>
            <a href={supportMailto}>Email</a>
            <a href="#linkedin">LinkedIn</a>
            <a href="#x">X</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
