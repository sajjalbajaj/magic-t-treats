import { IndianRupee, TrendingUp } from "lucide-react";

import { BarList, FilterTabs, MetricCard } from "@/components/admin/admin-ui";
import { Card, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  getEnquiryFunnel,
  getLeadSources,
  getMostEnquired,
  getRevenueSummary,
} from "@/lib/data/admin";
import { formatCurrency, titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

const RANGES = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "12 months", value: "365" },
];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { days: daysParam } = await searchParams;

  // Clamped so a hand-edited URL cannot ask for an unbounded scan.
  const days = Math.min(Math.max(Number(daysParam ?? "30") || 30, 1), 365);

  const [mostEnquired, leadSources, funnel, revenue] = await Promise.all([
    getMostEnquired(supabase, days, 8),
    getLeadSources(supabase, days),
    getEnquiryFunnel(supabase, days),
    getRevenueSummary(supabase),
  ]);

  const funnelSteps = funnel
    ? [
        { label: "Enquiry clicks", value: funnel.enquiry_clicks },
        { label: "Enquiries submitted", value: funnel.submitted },
        { label: "Contacted", value: funnel.contacted },
        { label: "Converted to orders", value: funnel.converted },
        { label: "Delivered", value: funnel.delivered },
      ]
    : [];

  const funnelTop = funnelSteps[0]?.value ?? 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Where your enquiries come from, and what they turn into."
      />

      <FilterTabs
        options={RANGES}
        active={String(days)}
        basePath="/admin/analytics"
        paramName="days"
      />

      {revenue ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Revenue today"
            value={formatCurrency(revenue.today)}
            icon={IndianRupee}
          />
          <MetricCard label="This week" value={formatCurrency(revenue.this_week)} />
          <MetricCard label="This month" value={formatCurrency(revenue.this_month)} />
          <MetricCard
            label="Outstanding"
            value={formatCurrency(revenue.outstanding)}
            hint="Balance still to collect"
            tone={revenue.outstanding > 0 ? "attention" : "default"}
          />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="font-sans text-base font-bold text-admin-ink">
              Most enquired products
            </h2>
            <p className="text-xs text-admin-muted">Last {days} days.</p>
          </div>
          <BarList
            items={mostEnquired.map((row) => ({
              label: row.product_name,
              value: Number(row.enquiry_count),
            }))}
            emptyLabel="No enquiries in this period."
          />
        </Card>

        <Card className="flex flex-col gap-4">
          <div>
            <h2 className="font-sans text-base font-bold text-admin-ink">Where leads come from</h2>
            <p className="text-xs text-admin-muted">
              Based on the campaign tag or referring site.
            </p>
          </div>
          <BarList
            items={leadSources.map((row) => ({
              label: titleCase(row.source),
              value: Number(row.lead_count),
              display: `${row.share}%`,
            }))}
            emptyLabel="No enquiries in this period."
          />
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sans text-base font-bold text-admin-ink">Enquiry funnel</h2>
            <p className="text-xs text-admin-muted">
              From tapping “Enquire” through to a delivered order.
            </p>
          </div>
          <TrendingUp className="size-5 text-admin-muted" aria-hidden="true" />
        </div>

        {funnelSteps.length === 0 || funnelTop === 0 ? (
          <p className="text-sm text-admin-muted">
            Not enough data yet. Once visitors start enquiring, the funnel will fill in here.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {funnelSteps.map((step, index) => {
              const previous = index === 0 ? null : funnelSteps[index - 1]?.value;
              // Each step is measured against the one above it, which is what
              // actually tells you where people are dropping out.
              const rate =
                previous && previous > 0 ? Math.round((step.value / previous) * 100) : null;
              const width = funnelTop > 0 ? Math.max(4, (step.value / funnelTop) * 100) : 0;

              return (
                <li key={step.label} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-admin-ink">{step.label}</span>
                    <span className="tabular-nums text-admin-muted">
                      {step.value}
                      {rate !== null ? (
                        <span className="ml-2 text-xs">({rate}% of previous)</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-admin-bg">
                    <div
                      className="h-full rounded-full bg-admin-accent"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </>
  );
}
