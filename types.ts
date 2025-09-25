
export enum UserRole {
  Admin = 'admin',
  Finance = 'finance',
  Supervisor = 'supervisor',
}

export type Theme = 'light' | 'dark';

export interface WeaverDesignAllocation {
  allocationId: number;
  designId: number;
  colors: string[];
  status: 'Active' | 'Completed';
}

export interface Weaver {
  id: number;
  name: string;
  contact: string;
  joinDate: string;
  loomNumber: number;
  loomType: 'Own' | 'Rental';
  wageType: 'Per_Piece' | 'Fixed';
  rate: number; // Per piece rate or fixed daily/weekly rate
  rentalCost?: number;
  rentalPeriod?: 'Weekly' | 'Monthly';
  designAllocations: WeaverDesignAllocation[];
}

export interface Design {
  id: number;
  name: string;
  towelSize: 'S' | 'M' | 'L' | 'XL';
  defaultRate: number;
  image?: string;
}

export interface ProductionLogItem {
  designId: number;
  color: string;
  quantity: number;
}

export interface ProductionLog {
  id: number;
  date: string;
  weaverId: number;
  items: ProductionLogItem[];
  yarnIssued: {
    warp?: number; // in kgs
    weft?: number; // in kgs
  };
}

export interface Loan {
  id: number;
  weaverId: number;
  amount: number;
  issueDate: string;
  dueDate?: string;
  repaymentDate?: string;
  status: 'Pending' | 'Paid';
}

export interface Repayment {
  id: number;
  loanId: number;
  amount: number;
  date: string;
}

export interface RentalPayment {
  id: number;
  weaverId: number;
  amount: number;
  date: string;
}

export interface AuditLog {
    id: number;
    timestamp: string;
    user: UserRole;
    action: 'Created' | 'Updated' | 'Deleted';
    module: string;
    details: string;
}