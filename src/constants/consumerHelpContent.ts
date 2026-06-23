/** Consumer Help Center — v1 English content (repo constants). */

export const CONSUMER_HELP_CATEGORIES = [
  {
    id: 'getting-started',
    label: 'Getting started',
    description: 'Solar Hub basics and access',
  },
  {
    id: 'your-system',
    label: 'Your system',
    description: 'Equipment, capacity, and health',
  },
  {
    id: 'energy',
    label: 'Energy & savings',
    description: 'Track tab, bills, and usage tips',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    description: 'Cleaning, inspections, and service requests',
  },
  {
    id: 'discom',
    label: 'DISCOM & net metering',
    description: 'KSEB registration, net meter, and billing',
  },
  {
    id: 'warranty',
    label: 'Warranty',
    description: 'Coverage, claims, and exclusions',
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    description: 'Common issues and what to do',
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Login, password, and profile',
  },
] as const;

export type ConsumerHelpCategoryId = (typeof CONSUMER_HELP_CATEGORIES)[number]['id'];

export type ConsumerHelpFaqItem = {
  id: string;
  category: ConsumerHelpCategoryId;
  question: string;
  answer: string;
};

export const CONSUMER_HELP_FAQ_ITEMS: ConsumerHelpFaqItem[] = [
  {
    id: 'what-is-solar-hub',
    category: 'getting-started',
    question: 'What is Rayenna Solar Hub?',
    answer:
      'Solar Hub is your homeowner app for a Rayenna solar installation. Use it to track generation and savings, view warranty and maintenance schedules, read guides, and contact support — on your phone or desktop.',
  },
  {
    id: 'hub-login',
    category: 'getting-started',
    question: 'How do I log in to Solar Hub?',
    answer:
      'Use the username and temporary password Rayenna shared when your project reached completion. Open the Hub, enter your username (not your email), and sign in. Change your password under Profile → Change Password after first login.',
  },
  {
    id: 'who-gets-access',
    category: 'getting-started',
    question: 'When do I get Hub access?',
    answer:
      'Hub accounts are created automatically when your CRM project status is Completed or Subsidy Credited. If you believe your system is live but you cannot log in, contact Support with your customer name and site address.',
  },
  {
    id: 'system-spec-location',
    category: 'your-system',
    question: 'Where do I see my system size and equipment?',
    answer:
      'Open Maintain or Profile for the full equipment card (capacity, panel brand/type, inverter). Home shows a one-line summary. Details come from your Rayenna project record and update when our team confirms specifications.',
  },
  {
    id: 'system-health-meaning',
    category: 'your-system',
    question: 'What do the health indicators on Maintain mean?',
    answer:
      'Optimal means recent generation looks normal for your system size and season. Warning or Critical suggests unusually low output or a gap in data — check shading, inverter status, and your internet connection. Use Report an issue if the status stays red.',
  },
  {
    id: 'track-charts',
    category: 'energy',
    question: 'How do I read my generation charts in Track?',
    answer:
      'Track shows daily, monthly, and yearly energy from your inverter or monitoring gateway when connected. Compare sunny vs cloudy days and use exports if you need records for DISCOM or personal tracking. Data may take up to 24 hours to refresh after commissioning.',
  },
  {
    id: 'net-metering-basics',
    category: 'energy',
    question: 'How does net metering work on my bill?',
    answer:
      'With a bi-directional (net) meter, solar units you consume on-site reduce your import. Excess units exported to the KSEB grid are credited per your DISCOM tariff rules. Your monthly bill reflects import minus export for that billing period once net metering is active.',
  },
  {
    id: 'maximize-savings',
    category: 'energy',
    question: 'How do I maximize my solar savings?',
    answer:
      'Run high-load appliances (washing machine, water pump, AC) during peak solar hours (typically 10 AM–3 PM). Keep panels clean, avoid new shading from trees or structures, and review monthly generation in Track to spot drops early.',
  },
  {
    id: 'monsoon-generation',
    category: 'energy',
    question: 'Why is generation lower during monsoon?',
    answer:
      'Cloud cover and shorter sun hours reduce output between June and September in Kerala. This is normal — annual totals still meet expectations over the full year. Focus on year-to-date charts rather than a single rainy week.',
  },
  {
    id: 'panel-cleaning-schedule',
    category: 'maintenance',
    question: 'How often are panel cleanings scheduled?',
    answer:
      'Rayenna schedules panel cleaning visits starting six months after your net meter installation date, then every six months for five years (ten visits total). Upcoming visits appear under Maintain → Maintenance schedule. Contact Support if your net meter date looks wrong.',
  },
  {
    id: 'request-service',
    category: 'maintenance',
    question: 'How do I request service or report an issue?',
    answer:
      'Go to Maintain → Report an issue or Schedule service. Describe the problem, add photos if helpful, and submit. For urgent safety concerns (smoke, burning smell, exposed wiring), call 24/7 Emergency Support on the Support tab immediately.',
  },
  {
    id: 'discom-net-meter-steps',
    category: 'discom',
    question: 'What is the DISCOM net metering process after installation?',
    answer:
      'For Kerala (KSEB) rooftop solar, Rayenna typically coordinates these steps on your behalf:\n\n1. Submit net metering application with site documents after installation.\n2. DISCOM feasibility / technical approval for your connection and capacity.\n3. Installation of the bi-directional (net) meter at your premises.\n4. Meter testing and synchronization with KSEB billing systems.\n5. Activation of solar billing — export credits appear on subsequent bills.\n\nTimelines vary by section office and load. We update key dates in your project; ask Support for status if commissioning is complete but billing has not switched.',
  },
  {
    id: 'discom-timeline',
    category: 'discom',
    question: 'How long until my net meter is installed?',
    answer:
      'Most net meter installations complete within a few weeks after DISCOM approval, but KSEB section workloads can extend this. Rayenna follows up on pending applications. You can use Support → Send a Query with subject "Net meter status" for a project-specific update.',
  },
  {
    id: 'discom-documents',
    category: 'discom',
    question: 'What documents are needed for DISCOM / KSEB registration?',
    answer:
      'Commonly required items include: consumer number, identity proof, property tax receipt or ownership proof, installation completion report, single-line diagram, and commissioning certificate. Rayenna prepares technical documents; we may ask you to sign KSEB forms or provide a recent electricity bill copy.',
  },
  {
    id: 'discom-bill-credits',
    category: 'discom',
    question: 'When will I see solar credits on my electricity bill?',
    answer:
      'Credits appear after the net meter is installed, tested, and linked to your consumer account in KSEB billing — usually within one or two billing cycles after activation. Until then, you may still see import-only readings. Keep your pre-solar bills for comparison once solar billing starts.',
  },
  {
    id: 'warranty-coverage',
    category: 'warranty',
    question: 'What warranty coverage does my Rayenna system include?',
    answer:
      'Typical Rayenna installations include:\n\n• Solar panels — product warranty up to 25 years (brand-specific; see your equipment card).\n• Inverter — manufacturer warranty, commonly 5 years (extendable per brand policy).\n• Workmanship — Rayenna installation warranty for defects in our installation work.\n\nExact terms depend on the brands on your project. Open Maintain → Warranty for your dates and remaining coverage.',
  },
  {
    id: 'warranty-check-dates',
    category: 'warranty',
    question: 'How do I check warranty expiry dates?',
    answer:
      'Maintain → Warranty lists each component with total term, years remaining, and expiry date calculated from your commissioning date. Profile also shows equipment details. Contact Support if a component is missing or dates look incorrect.',
  },
  {
    id: 'warranty-exclusions',
    category: 'warranty',
    question: 'What is not covered under warranty?',
    answer:
      'Warranties generally do not cover: damage from floods, fire, lightning, or improper third-party work; vandalism; normal wear of consumables; shading or soiling losses; grid outages; or misuse. Storm or animal damage may need insurance — check your home policy.',
  },
  {
    id: 'warranty-claim',
    category: 'warranty',
    question: 'How do I make a warranty claim?',
    answer:
      'Use Maintain → Report an issue with subject "Warranty claim", describe the fault, and note any inverter error codes. Rayenna verifies whether the issue is covered, coordinates with the manufacturer if needed, and schedules replacement or repair. Keep the inverter powered off only if safety requires it.',
  },
  {
    id: 'inverter-alarm',
    category: 'troubleshooting',
    question: 'My inverter shows a warning light — what should I do?',
    answer:
      'Note the error code on the display or app. Check the inverter manual for that code. Reset only if the manual allows. If the warning persists more than a few hours or generation is zero on a clear day, use Maintain → Report an issue or call Emergency Support.',
  },
  {
    id: 'no-generation-data',
    category: 'troubleshooting',
    question: 'My app shows no generation data — what should I check?',
    answer:
      'Confirm the inverter is on and grid-connected (no islanding alarm). Check Wi-Fi or data logger connectivity if your system uses monitoring. New systems may need up to 48 hours after commissioning for data to flow. If hardware looks fine but Track is empty for several days, report it via Maintain.',
  },
  {
    id: 'change-password',
    category: 'account',
    question: 'How do I change my password?',
    answer:
      'Profile → Change Password. Enter your current password, then a new password at least 8 characters long. Use a unique password you do not share with others. If you forget your password, contact Rayenna Support — self-service reset is not available in v1.',
  },
  {
    id: 'family-login',
    category: 'account',
    question: 'Can my family use the same Hub login?',
    answer:
      'One username is issued per household project. Family members may share the login on trusted devices. Do not post credentials publicly. For separate access needs, contact Support — additional accounts may be offered in a future release.',
  },
];

/** Shown as quick links on the Support tab. */
export const CONSUMER_HELP_FEATURED_FAQ_IDS = [
  'discom-net-meter-steps',
  'warranty-coverage',
  'hub-login',
] as const;

const categoryLabelById = Object.fromEntries(
  CONSUMER_HELP_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<ConsumerHelpCategoryId, string>;

export function getConsumerHelpCategoryLabel(categoryId: ConsumerHelpCategoryId): string {
  return categoryLabelById[categoryId] ?? categoryId;
}

export function getConsumerHelpFeaturedFaqs(): ConsumerHelpFaqItem[] {
  const byId = new Map(CONSUMER_HELP_FAQ_ITEMS.map((f) => [f.id, f]));
  return CONSUMER_HELP_FEATURED_FAQ_IDS.map((id) => byId.get(id)).filter(
    (f): f is ConsumerHelpFaqItem => Boolean(f),
  );
}
