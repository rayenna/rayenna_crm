import { getProjectSegmentLabel } from './projectSegment';

const CUSTOMER_TYPE_EXPORT_LABELS: Record<string, string> = {
  RESIDENTIAL: 'Residential',
  APARTMENT: 'Apartment',
  COMMERCIAL: 'Commercial',
};

export const PROJECTS_EXPORT_INCLUDE = {
  customer: {
    select: {
      customerId: true,
      customerName: true,
      customerType: true,
      firstName: true,
      middleName: true,
      lastName: true,
      prefix: true,
      consumerNumber: true,
    },
  },
  salesperson: {
    select: { name: true, email: true },
  },
} as const;

function getCustomerDisplayNameForExport(customer: {
  prefix?: string | null;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  customerName?: string | null;
} | null | undefined): string {
  if (!customer) return '';
  const parts = [customer.prefix, customer.firstName, customer.middleName, customer.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : customer.customerName || '';
}

function customerTypeExportLabel(customerType: string | null | undefined): string {
  if (!customerType) return '';
  return CUSTOMER_TYPE_EXPORT_LABELS[customerType] ?? customerType.replace(/_/g, ' ');
}

/** Flat row for Excel/CSV export (column order stable for finance users). */
export function mapProjectToExportRow(project: {
  slNo?: number | null;
  type: string;
  projectServiceType?: string | null;
  systemCapacity?: number | null;
  projectCost?: number | null;
  projectStatus: string;
  paymentStatus?: string | null;
  year?: string | null;
  confirmationDate?: Date | null;
  createdAt?: Date | null;
  customer?: {
    customerId?: string | null;
    customerName?: string | null;
    customerType?: string | null;
    consumerNumber?: string | null;
    prefix?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
  } | null;
  salesperson?: { name?: string | null; email?: string | null } | null;
}): Record<string, string | number> {
  return {
    'SL No': project.slNo || '',
    'Customer ID': project.customer?.customerId || '',
    'Customer Name':
      getCustomerDisplayNameForExport(project.customer) || project.customer?.customerName || '',
    'Customer Type': customerTypeExportLabel(project.customer?.customerType),
    'Consumer Number': project.customer?.consumerNumber || '',
    Segment: getProjectSegmentLabel(project.type),
    'Project Service Type': project.projectServiceType?.replace(/_/g, ' ') || '',
    'System Capacity (kW)': project.systemCapacity || 0,
    'Project Cost': project.projectCost || 0,
    'Project Status': project.projectStatus.replace(/_/g, ' ') || '',
    'Payment Status': project.paymentStatus?.replace(/_/g, ' ') || '',
    Salesperson: project.salesperson?.name || '',
    'Salesperson Email': project.salesperson?.email || '',
    Year: project.year || '',
    'Confirmation Date': project.confirmationDate
      ? new Date(project.confirmationDate).toLocaleDateString('en-IN')
      : '',
    'Created At': project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-IN') : '',
  };
}
