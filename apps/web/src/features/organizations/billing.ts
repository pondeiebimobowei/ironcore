export const billingTabs = [
  "Overview",
  "Billing History",
  "Payment Methods",
  "Invoices",
  "Plan & Usage",
];

export const usageItems = [
  { label: "Members", value: "248", limit: "500", percent: 50 },
  { label: "Recovery Queue", value: "78", limit: "1,000", percent: 8 },
  { label: "Mock WhatsApp Messages", value: "342", limit: "5,000", percent: 7 },
  { label: "Staff Users", value: "6", limit: "10", percent: 60 },
];

export type RecentInvoice = {
  id: string;
  date: string;
  period: string;
  amount: string;
};

export const recentInvoices: RecentInvoice[] = [
  {
    id: "INV-2026-00005",
    date: "May 5, 2026",
    period: "May 5 - Jun 5, 2026",
    amount: "₦120,000",
  },
  {
    id: "INV-2026-00004",
    date: "Apr 5, 2026",
    period: "Apr 5 - May 5, 2026",
    amount: "₦120,000",
  },
  {
    id: "INV-2026-00003",
    date: "Mar 5, 2026",
    period: "Mar 5 - Apr 5, 2026",
    amount: "₦120,000",
  },
  {
    id: "INV-2026-00002",
    date: "Feb 5, 2026",
    period: "Feb 5 - Mar 5, 2026",
    amount: "₦120,000",
  },
  {
    id: "INV-2026-00001",
    date: "Jan 5, 2026",
    period: "Jan 5 - Feb 5, 2026",
    amount: "₦120,000",
  },
];
