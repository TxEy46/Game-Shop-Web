export interface DiscountCode {
  id?: number;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_total: number;               // ยอดซื้อขั้นต่ำ
  active: boolean | number;
  usage_limit?: number;
  single_use_per_user?: boolean;
  start_date?: string;             // วันเริ่มต้น
  end_date?: string;               // วันหมดอายุ
  finalAmount?: number;
  used_by_user?: boolean;
}
