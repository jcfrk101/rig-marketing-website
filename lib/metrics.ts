// Live fleet service metrics — mirrors how fleet.bigrig.app's FleetMarketingPage
// pulls stats from the backend.
// Source: rig-web-app/features/FleetMarketingPage/FleetMarketingPage.tsx

// Public, admin-id-gated metrics endpoint (no auth headers, same as the fleet site).
const METRICS_PATH = '/admin/a52d35fa-b696-4a13-93e6-a31f4f98d9a7/service/metrics'

// Industry benchmarks (2025 roadside assistance benchmarks) used for comparison.
export const INDUSTRY_TIME_TO_DISPATCH = 37
export const INDUSTRY_BIDS_PER_JOB = 1
export const INDUSTRY_AVG_COST = 650
export const INDUSTRY_TIME_TO_ARRIVAL = 60

export interface ServiceMetrics {
  avg_time_to_first_offer_minutes: number
  avg_offers_per_completed_request: number
  avg_completed_offer_cost: number
  avg_time_to_arrival: number
  total_completed_service_requests: number
  first_service_request_date: string
}

export interface StatCard {
  label: string
  rig: string
  industry: string
  delta: string
}

export interface DerivedStats {
  metrics: StatCard[]
  trucksServiced: string
  servicingSince: string
  timeToDispatch: string
}

function formatArrivalTime(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

function formatComparison(
  rigValue: number,
  industryValue: number,
  lowerIsBetter: boolean,
  ratioPrecision = 0,
  percentOnly = false,
): string {
  const ratio = lowerIsBetter ? industryValue / rigValue : rigValue / industryValue
  const improvementPct = lowerIsBetter
    ? ((industryValue - rigValue) / rigValue) * 100
    : ((rigValue - industryValue) / industryValue) * 100

  if (improvementPct > 100 && !percentOnly) {
    const factor = Math.pow(10, ratioPrecision)
    return `${Math.round(ratio * factor) / factor}×`
  }

  if (lowerIsBetter) {
    const savePct = Math.floor(((industryValue - rigValue) / industryValue) * 100)
    return percentOnly ? `${savePct}%` : `${savePct}% less`
  }

  return percentOnly ? `${Math.floor(improvementPct)}%` : `${Math.floor(improvementPct)}% more`
}

// Turn a raw backend payload into display-ready stat cards, using the same
// rounding and comparison rules as the fleet site.
export function deriveStats(m: ServiceMetrics): DerivedStats {
  const rigTimeToDispatch = Math.round(m.avg_time_to_first_offer_minutes * 10) / 10
  const rigAvgCost = Math.floor(m.avg_completed_offer_cost)
  const rigTimeToArrivalMinutes = Math.floor(m.avg_time_to_arrival / 60)

  return {
    metrics: [
      {
        label: 'Avg. time to dispatch',
        rig: `${rigTimeToDispatch} min`,
        industry: `${INDUSTRY_TIME_TO_DISPATCH} min`,
        delta: `${formatComparison(rigTimeToDispatch, INDUSTRY_TIME_TO_DISPATCH, true, 1)} faster`,
      },
      {
        label: 'Avg. cost of road service',
        rig: `$${rigAvgCost}`,
        industry: `$${INDUSTRY_AVG_COST}`,
        delta: `${formatComparison(rigAvgCost, INDUSTRY_AVG_COST, true, 0, true)} cheaper`,
      },
      {
        label: 'Avg. time to arrive',
        rig: formatArrivalTime(m.avg_time_to_arrival),
        industry: `${INDUSTRY_TIME_TO_ARRIVAL} min`,
        delta: `${formatComparison(rigTimeToArrivalMinutes, INDUSTRY_TIME_TO_ARRIVAL, true, 0, true)} faster`,
      },
    ],
    trucksServiced: m.total_completed_service_requests.toLocaleString(),
    servicingSince: new Date(m.first_service_request_date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    timeToDispatch: `${rigTimeToDispatch} min`,
  }
}

// Fetch live metrics. Returns null on any failure (caller falls back to static copy).
export async function fetchServiceMetrics(): Promise<ServiceMetrics | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
  if (!apiUrl) return null
  try {
    const res = await fetch(`${apiUrl}${METRICS_PATH}`)
    if (!res.ok) return null
    const json = await res.json()
    return json?.data ?? null
  } catch {
    return null
  }
}
