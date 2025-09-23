export interface Transaction {
    id: number;
    user_id: number;
    user_name: string; // เพิ่มฟิลด์นี้
    type: string;
    amount: string;
    description: string;
    created_at: string;
}