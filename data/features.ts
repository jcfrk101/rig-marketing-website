// PLACEHOLDER — replace with real statuses.
// Source of truth for the "Feature status" section. To update the page, edit this list:
// change `status` between 'live' and 'rolling-out', add/remove items, or tweak copy.

export type FeatureState = 'live' | 'rolling-out'

export interface Feature {
  name: string
  description: string
  status: FeatureState
  // Which stage of the execution flow this maps to (for visual grouping/labels).
  stage: 'Dispatching' | 'Payment' | 'Fulfillment' | 'Documentation' | 'Platform'
}

export const features: Feature[] = [
  // ---- Live ----
  {
    name: 'Execution Layer',
    description:
      'Dispatching, payment, fulfillment, and documentation — the full breakdown response, executed and recorded end-to-end in one place.',
    status: 'live',
    stage: 'Platform',
  },
  {
    name: 'Nationwide mechanic network',
    description: '6,000+ vetted mechanics and shops, coast to coast.',
    status: 'live',
    stage: 'Fulfillment',
  },
  {
    name: 'Fleet analytics & insights',
    description: 'Spend, downtime, and reliability trends across the whole fleet.',
    status: 'live',
    stage: 'Platform',
  },
  {
    name: 'Telematics integrations',
    description: 'Samsara, Motive, and Isaac connections feeding breakdowns in automatically.',
    status: 'live',
    stage: 'Platform',
  },

  // ---- Rolling out ----
  {
    name: 'Preventive maintenance scheduling',
    description: 'Schedule and track recurring service before units go down.',
    status: 'rolling-out',
    stage: 'Dispatching',
  },
  {
    name: 'AI Agent Calling Swarms',
    description: 'AI calling agents work the phones in parallel to pull competitive bids from national service providers.',
    status: 'rolling-out',
    stage: 'Dispatching',
  },
  {
    name: 'Fleet Internal Mechanic Dispatch',
    description: 'Route jobs to your own in-house mechanics before going to the network.',
    status: 'rolling-out',
    stage: 'Dispatching',
  },
  {
    name: 'Driver Mobile App with PTI Reports',
    description: 'A dedicated driver app for requesting and tracking service — with pre-trip inspection (PTI) reports captured straight into the unit’s maintenance record. A built-in violation detection engine flags defects and compliance issues from each report automatically.',
    status: 'rolling-out',
    stage: 'Fulfillment',
  },
  {
    name: 'Decision Engine',
    description: 'Turns execution and history data into routing, repair-or-replace, and preventive decisions.',
    status: 'rolling-out',
    stage: 'Platform',
  },
]
