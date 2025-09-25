
import { Weaver, ProductionLog, Loan, Design, Repayment, RentalPayment, WeaverDesignAllocation } from './types';

export const initialDesigns: Design[] = [
    { id: 1, name: 'Classic Check', towelSize: 'M', defaultRate: 15, image: 'https://placehold.co/400x400/e2e8f0/475569?text=Classic+Check' },
    { id: 2, name: 'Diamond Weave', towelSize: 'L', defaultRate: 18, image: 'https://placehold.co/400x400/dbeafe/1e3a8a?text=Diamond+Weave' },
    { id: 3, name: 'Striped Elegance', towelSize: 'S', defaultRate: 12, image: 'https://placehold.co/400x400/fee2e2/991b1b?text=Striped+Elegance' },
    { id: 4, name: 'Luxury Jacquard', towelSize: 'XL', defaultRate: 25, image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Luxury+Jacquard' },
];

const weaver1Allocations: WeaverDesignAllocation[] = [
    { allocationId: 101, designId: 1, colors: ['Red', 'Blue', 'Green'], status: 'Active' },
    { allocationId: 102, designId: 2, colors: ['White', 'Black'], status: 'Active' },
];
const weaver2Allocations: WeaverDesignAllocation[] = [
    { allocationId: 201, designId: 2, colors: ['Gold', 'Silver'], status: 'Active' },
    { allocationId: 202, designId: 3, colors: ['Pink', 'Yellow'], status: 'Completed' },
];
const weaver4Allocations: WeaverDesignAllocation[] = [
    { allocationId: 401, designId: 4, colors: ['Royal Blue', 'Maroon'], status: 'Active' },
];


export const initialWeavers: Weaver[] = [
  { id: 1, name: 'Rajesh Kumar', contact: '9876543210', joinDate: '2023-01-15', loomNumber: 101, loomType: 'Own', wageType: 'Per_Piece', rate: 15, designAllocations: weaver1Allocations },
  { id: 2, name: 'Suresh Singh', contact: '9876543211', joinDate: '2023-02-20', loomNumber: 102, loomType: 'Rental', wageType: 'Per_Piece', rate: 18, rentalCost: 500, rentalPeriod: 'Weekly', designAllocations: weaver2Allocations },
  { id: 3, name: 'Mina Devi', contact: '9876543212', joinDate: '2023-03-10', loomNumber: 105, loomType: 'Own', wageType: 'Fixed', rate: 5000, designAllocations: [] },
  { id: 4, name: 'Amit Sharma', contact: '9876543213', joinDate: '2023-05-01', loomNumber: 201, loomType: 'Rental', wageType: 'Per_Piece', rate: 16.5, rentalCost: 2000, rentalPeriod: 'Monthly', designAllocations: weaver4Allocations },
];

export const initialProductionLogs: ProductionLog[] = Array.from({ length: 15 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const weaver = initialWeavers.filter(w => w.designAllocations.length > 0)[i % initialWeavers.filter(w => w.designAllocations.length > 0).length];
    const allocation = weaver.designAllocations[i % weaver.designAllocations.length];
    return {
        id: i + 1,
        date: date.toISOString().split('T')[0],
        weaverId: weaver.id,
        items: [
            {
                designId: allocation.designId,
                color: allocation.colors[0],
                quantity: Math.floor(Math.random() * (25 - 10 + 1)) + 10,
            },
            {
                designId: allocation.designId,
                color: allocation.colors[1 % allocation.colors.length],
                quantity: Math.floor(Math.random() * (25 - 10 + 1)) + 10,
            }
        ],
        yarnIssued: {
            warp: i % 3 !== 0 ? parseFloat((Math.random() * (5 - 2) + 2).toFixed(2)) : undefined,
            weft: i % 2 === 0 ? parseFloat((Math.random() * (8 - 4) + 4).toFixed(2)) : undefined,
        }
    };
});

export const initialLoans: Loan[] = [
  { id: 1, weaverId: 2, amount: 5000, issueDate: '2024-05-10', dueDate: '2024-08-10', status: 'Pending' },
  { id: 2, weaverId: 4, amount: 2500, issueDate: '2024-04-20', dueDate: new Date(new Date().setDate(new Date().getDate() + 3)).toISOString().split('T')[0], status: 'Pending' },
  { id: 3, weaverId: 1, amount: 3000, issueDate: '2024-03-15', repaymentDate: '2024-04-15', status: 'Paid' },
];

export const initialRepayments: Repayment[] = [
  { id: 1, loanId: 2, amount: 1000, date: '2024-05-20' },
  { id: 2, loanId: 2, amount: 500, date: '2024-06-05' },
  { id: 3, loanId: 3, amount: 3000, date: '2024-04-15'},
];

export const initialRentalPayments: RentalPayment[] = [
    { id: 1, weaverId: 2, amount: 250, date: '2024-07-05' },
    { id: 2, weaverId: 2, amount: 250, date: '2024-07-12' },
    { id: 3, weaverId: 4, amount: 1000, date: '2024-06-30' },
];