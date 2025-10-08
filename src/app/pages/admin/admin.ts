// admin.ts
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { GameDetail } from '../../model/game';
import { Category } from '../../model/category';
import { DiscountCode } from '../../model/discountcode';
import { Transaction } from '../../model/transaction';
import { HeaderAdmin } from '../header-admin/header-admin';
import { Constants } from '../../config/constants';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    HeaderAdmin,
    MatTableModule,
    MatCheckboxModule,
  ],
  templateUrl: './admin.html',
  styleUrls: ['./admin.scss']
})
export class Admin implements OnInit {
  games: GameDetail[] = [];
  categories: Category[] = [];
  previews = new Map<number, string>();
  selectedFiles = new Map<number, File>();
  dialogRef!: MatDialogRef<any>;
  transactions: Transaction[] = [];
  discountCodes: DiscountCode[] = [];
  displayedColumns: string[] = ['code', 'type', 'value', 'active', 'countdown', 'actions'];

  discountCountdowns: { [key: number]: string } = {};
  countdownIntervals: { [key: number]: any } = {};

  @ViewChild('editDialog', { static: true }) editDialog!: TemplateRef<any>;
  @ViewChild('transactionsDialog', { static: true }) transactionsDialog!: TemplateRef<any>;
  @ViewChild('discountDialog', { static: true }) discountDialog!: TemplateRef<any>;
  @ViewChild('discountManagerDialog', { static: true }) discountManagerDialog!: TemplateRef<any>;

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private router: Router,
    private constants: Constants
  ) { }

  private get API_ENDPOINT(): string {
    return this.constants.API_ENDPOINT;
  }

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      this.router.navigate(['/login']);
      return;
    }

    const user = JSON.parse(storedUser);
    if (user.role !== 'admin') {
      this.router.navigate(['/shop']);
      return;
    }

    this.loadGames();
    this.loadCategories();
    this.loadDiscountCodes();

    // อัพเดต countdown ทุกนาที
    setInterval(() => {
      this.updateDiscountCountdowns();
    }, 60000);
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      }),
      withCredentials: true
    };
  }

  // ================= Games =================
  loadGames() {
    console.log('🔄 Loading games...');
    this.http.get<any>(`${this.API_ENDPOINT}/games`, this.getAuthHeaders())
      .subscribe({
        next: (data) => {
          console.log('📦 Raw games data:', data);

          const gamesData = Array.isArray(data) ? data : (data.games || data);

          this.games = gamesData.map((g: any) => {
            return {
              id: g.id,
              name: g.name,
              price: g.price,
              category_id: g.category_id,
              image_url: this.resolveImageURL(g.image_url),
              description: g.description || '',
              release_date: g.release_date,
              category_name: g.category || g.category_name,
              sales_count: g.sales_count,
              total_sales: g.total_sales
            };
          });

          console.log('✅ Loaded games:', this.games.length);
        },
        error: err => console.error('❌ Error loading games:', err)
      });
  }

  private resolveImageURL(url?: string | null): string {
    if (!url || url === '') {
      return '/assets/placeholder.png';
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    if (url.startsWith('/uploads/')) {
      return `${this.API_ENDPOINT}${url}`;
    }

    if (!url.includes('/')) {
      return `${this.API_ENDPOINT}/uploads/${url}`;
    }

    return `${this.API_ENDPOINT}${url.startsWith('/') ? url : '/' + url}`;
  }

  loadCategories() {
    console.log('🔄 Loading categories...');
    this.http.get<any>(`${this.API_ENDPOINT}/categories`, this.getAuthHeaders())
      .subscribe({
        next: (data) => {
          const categoriesData = Array.isArray(data) ? data : (data.categories || data);
          this.categories = categoriesData;
          console.log('✅ Loaded categories:', this.categories.length);
        },
        error: err => console.error('❌ Error loading categories:', err)
      });
  }

  openAddGame() {
    const newGame: GameDetail = {
      id: 0,
      name: '',
      price: 0,
      category_id: 0,
      description: ''
    };
    this.dialogRef = this.dialog.open(this.editDialog, {
      data: newGame,
      width: '600px'
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.previews.delete(0);
      this.selectedFiles.delete(0);
    });
  }

  openEditGame(game: GameDetail) {
    this.dialogRef = this.dialog.open(this.editDialog, {
      data: { ...game },
      width: '600px'
    });
    this.dialogRef.afterClosed().subscribe(() => {
      this.previews.delete(game.id);
      this.selectedFiles.delete(game.id);
    });
  }

  saveGame(game: GameDetail) {
    if (!game.name) { this.showAlert('กรุณาใส่ชื่อเกม'); return; }
    if (!game.price || game.price <= 0) { this.showAlert('กรุณาใส่ราคาที่ถูกต้อง'); return; }
    if (!game.category_id || game.category_id <= 0) { this.showAlert('กรุณาเลือกหมวดหมู่เกม'); return; }
    if (!game.description || game.description.trim() === '') { this.showAlert('กรุณาใส่รายละเอียดเกม'); return; }

    const file = this.selectedFiles.get(game.id || 0);
    const formData = new FormData();
    formData.append("name", game.name);
    formData.append("price", game.price.toString());
    formData.append("category_id", game.category_id.toString());
    formData.append("description", game.description);
    if (file) formData.append("image", file);

    const request$ = game.id && game.id > 0
      ? this.http.put(`${this.API_ENDPOINT}/admin/games/${game.id}`, formData, this.getAuthHeaders())
      : this.http.post(`${this.API_ENDPOINT}/admin/games`, formData, this.getAuthHeaders());

    request$.subscribe({
      next: () => {
        if (game.id && game.id > 0) {
          this.selectedFiles.delete(game.id);
          this.previews.delete(game.id);
        } else {
          this.selectedFiles.delete(0);
          this.previews.delete(0);
        }

        this.loadGames();
        this.showAlert('บันทึกข้อมูลเรียบร้อยแล้ว');
        this.dialogRef.close();
      },
      error: err => {
        console.error('❌ Error saving game:', err);
        const message = err.error?.message || 'เกิดข้อผิดพลาดในการบันทึกเกม';
        this.showAlert(message);
      }
    });
  }

  deleteGame(gameId: number) {
    if (!confirm('ยืนยันการลบเกม?')) return;

    this.http.delete(`${this.API_ENDPOINT}/admin/games/delete/${gameId}`, this.getAuthHeaders())
      .subscribe({
        next: () => {
          this.loadGames();
          this.showAlert('ลบเกมเรียบร้อยแล้ว');
        },
        error: err => {
          console.error('❌ Error deleting game:', err);
          const message = typeof err.error === 'string' && err.error.includes('purchased')
            ? 'ไม่สามารถลบเกมนี้ได้ เนื่องจากมีผู้ซื้อไปแล้ว'
            : err.error?.message || 'เกิดข้อผิดพลาดในการลบเกม';
          this.showAlert(message);
        }
      });
  }

  onFileChange(event: any, gameId: number) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFiles.set(gameId, file);
      const reader = new FileReader();
      reader.onload = () => this.previews.set(gameId, reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  // ================= Discount Codes =================
  loadDiscountCodes() {
    console.log('🔄 Loading discount codes...');

    this.http.get<any>(`${this.API_ENDPOINT}/admin/discounts`, this.getAuthHeaders())
      .subscribe({
        next: (response) => {
          console.log('📦 Discount codes response:', response);

          let discountsData: any[] = [];

          if (Array.isArray(response)) {
            discountsData = response;
          } else if (response.discounts && Array.isArray(response.discounts)) {
            discountsData = response.discounts;
          } else if (response.data && Array.isArray(response.data)) {
            discountsData = response.data;
          } else {
            console.warn('Unexpected discount codes response structure:', response);
            discountsData = [];
          }

          console.log('📊 Processed discount data:', discountsData);

          this.discountCodes = discountsData.map((d: any) => ({
            id: d.id,
            code: d.code,
            type: d.type || 'percent',
            value: d.value || 0,
            min_total: d.min_total || d.minTotal || 0,
            active: d.active !== undefined ? d.active : true,
            usage_limit: d.usage_limit || d.usageLimit,
            single_use_per_user: d.single_use_per_user || d.singleUsePerUser || false,
            start_date: d.start_date || d.startDate,
            end_date: d.end_date || d.endDate,
            created_at: d.created_at || d.createdAt,
            finalAmount: d.finalAmount,
            used_by_user: d.used_by_user || false,
            countdown_days: d.countdown_days
          }));

          console.log('✅ Loaded discount codes:', this.discountCodes.length);
          this.updateDiscountCountdowns();
        },
        error: (err) => {
          console.error('❌ Error loading discount codes:', err);
          this.tryAlternativeDiscountEndpoints();
        }
      });
  }

  private tryAlternativeDiscountEndpoints() {
    const alternativeEndpoints = [
      `${this.API_ENDPOINT}/discounts`,
      `${this.API_ENDPOINT}/admin/discount_codes`,
      `${this.API_ENDPOINT}/discount_codes`
    ];

    let currentIndex = 0;

    const tryNextEndpoint = () => {
      if (currentIndex >= alternativeEndpoints.length) {
        console.error('❌ All discount endpoints failed');
        this.showAlert('ไม่สามารถโหลดข้อมูลโค้ดส่วนลดได้');
        return;
      }

      const endpoint = alternativeEndpoints[currentIndex];
      console.log(`🔄 Trying alternative endpoint: ${endpoint}`);

      this.http.get<any>(endpoint, this.getAuthHeaders())
        .subscribe({
          next: (response) => {
            console.log(`✅ Success with endpoint: ${endpoint}`, response);

            let discountsData: any[] = [];
            if (Array.isArray(response)) {
              discountsData = response;
            } else if (response.discounts && Array.isArray(response.discounts)) {
              discountsData = response.discounts;
            } else {
              discountsData = [];
            }

            this.discountCodes = discountsData.map((d: any) => ({
              id: d.id,
              code: d.code,
              type: d.type || 'percent',
              value: d.value || 0,
              min_total: d.min_total || 0,
              active: d.active !== undefined ? d.active : true,
              usage_limit: d.usage_limit,
              single_use_per_user: d.single_use_per_user || false,
              start_date: d.start_date,
              end_date: d.end_date,
              created_at: d.created_at
            }));

            this.updateDiscountCountdowns();
          },
          error: (err) => {
            console.log(`❌ Endpoint ${endpoint} failed:`, err.status);
            currentIndex++;
            tryNextEndpoint();
          }
        });
    };

    tryNextEndpoint();
  }

  openDiscountManager() {
    this.dialogRef = this.dialog.open(this.discountManagerDialog, {
      width: '80vw',
      maxWidth: '620px',
    });
  }

  openDiscountDialog(data?: DiscountCode) {
    const discountData = data ? { ...data } : {
      id: 0,
      code: '',
      type: 'percent' as 'percent',
      value: 10,
      usage_limit: 100,
      min_total: 0,
      start_date: this.formatDateForInput(new Date()),
      end_date: this.formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      single_use_per_user: false,
      active: true
    };

    this.dialogRef = this.dialog.open(this.discountDialog, {
      data: discountData,
      width: '500px'
    });
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  saveDiscountCode(data: DiscountCode) {
    console.log('💾 Saving discount code:', data);

    if (!data.code || data.code.trim() === '') {
      this.showAlert('กรุณาใส่รหัสโค้ด');
      return;
    }
    if (!data.value || data.value <= 0) {
      this.showAlert('กรุณาใส่มูลค่าที่ถูกต้อง');
      return;
    }

    const payload = {
      code: data.code.trim(),
      type: data.type,
      value: data.value,
      min_total: data.min_total || 0,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      usage_limit: data.usage_limit || null,
      single_use_per_user: data.single_use_per_user || false,
      active: data.active !== undefined ? data.active : true
    };

    console.log('📤 Sending payload:', payload);

    const request$ = data.id && data.id > 0
      ? this.http.put(`${this.API_ENDPOINT}/admin/discounts/${data.id}`, payload, this.getAuthHeaders())
      : this.http.post(`${this.API_ENDPOINT}/admin/discounts`, payload, this.getAuthHeaders());

    request$.subscribe({
      next: (response) => {
        console.log('✅ Discount code saved:', response);
        this.loadDiscountCodes();
        this.showAlert('บันทึกข้อมูลเรียบร้อยแล้ว');
        this.dialogRef.close();
      },
      error: (err) => {
        console.error('❌ Error saving discount code:', err);
        const errorMessage = err.error?.message ||
          err.error?.error ||
          'เกิดข้อผิดพลาดในการบันทึกโค้ดส่วนลด';
        this.showAlert(errorMessage);
      }
    });
  }

  deleteDiscountCode(id: number) {
    if (!confirm('ยืนยันการลบโค้ดส่วนลด?')) return;

    console.log('🗑️ Deleting discount code:', id);

    this.http.delete(`${this.API_ENDPOINT}/admin/discounts/${id}`, this.getAuthHeaders())
      .subscribe({
        next: (response) => {
          console.log('✅ Discount code deleted:', response);
          this.loadDiscountCodes();
          this.showAlert('ลบโค้ดส่วนลดเรียบร้อยแล้ว');
        },
        error: (err) => {
          console.error('❌ Error deleting discount code:', err);
          const errorMessage = err.error?.message ||
            err.error?.error ||
            'เกิดข้อผิดพลาดในการลบโค้ดส่วนลด';
          this.showAlert(errorMessage);
        }
      });
  }

  updateDiscountCountdowns() {
    this.discountCodes.forEach(discount => {
      if (discount.end_date) {
        const endDate = new Date(discount.end_date);
        const now = new Date();
        const timeDiff = endDate.getTime() - now.getTime();

        if (timeDiff > 0) {
          const days = Math.ceil(timeDiff / (1000 * 3600 * 24));
          this.discountCountdowns[discount.id!] = `${days} วัน`;
        } else {
          this.discountCountdowns[discount.id!] = 'หมดอายุ';
        }
      } else {
        this.discountCountdowns[discount.id!] = 'ไม่มีกำหนด';
      }
    });
  }

  // ================= Transactions =================
  viewAllTransactions() {
    console.log('🔄 Loading all transactions...');

    this.http.get<any>(`${this.API_ENDPOINT}/admin/transactions`, this.getAuthHeaders())
      .subscribe({
        next: (response) => {
          console.log('📦 Transactions response:', response);

          let transactionsData: any[] = [];

          if (Array.isArray(response)) {
            transactionsData = response;
          } else if (response.transactions && Array.isArray(response.transactions)) {
            transactionsData = response.transactions;
          } else if (response.data && Array.isArray(response.data)) {
            transactionsData = response.data;
          } else {
            console.warn('Unexpected transactions response structure:', response);
            transactionsData = [];
          }

          this.transactions = transactionsData.map((t: any) => ({
            id: t.id || t.transaction_id,
            user_id: t.user_id,
            user_name: t.user_name || t.username || t.email || `User ${t.user_id}`,
            type: t.type || 'purchase',
            amount: t.amount ? t.amount.toString() : '0',
            description: t.description || this.getTransactionDescription(t.type),
            created_at: t.created_at || t.createdAt || new Date().toISOString()
          }));

          console.log('✅ Loaded transactions:', this.transactions.length);
          this.dialogRef = this.dialog.open(this.transactionsDialog, {
            width: '90vw',
            maxWidth: '1200px',
            height: '80vh'
          });
        },
        error: (err) => {
          console.error('❌ Error loading transactions:', err);
          this.showAlert('ไม่สามารถโหลดข้อมูลธุรกรรมได้', 5000);
        }
      });
  }

  // View transactions for specific user
  viewUserTransactions(userId: number) {
    console.log(`🔄 Loading transactions for user ${userId}...`);

    this.http.get<any>(`${this.API_ENDPOINT}/admin/transactions/user/${userId}`, this.getAuthHeaders())
      .subscribe({
        next: (response) => {
          console.log(`📦 User transactions response for user ${userId}:`, response);

          let userTransactionsData: any[] = [];

          if (Array.isArray(response)) {
            userTransactionsData = response;
          } else if (response.transactions && Array.isArray(response.transactions)) {
            userTransactionsData = response.transactions;
          } else if (response.data && Array.isArray(response.data)) {
            userTransactionsData = response.data;
          } else {
            console.warn('Unexpected user transactions response structure:', response);
            userTransactionsData = [];
          }

          this.transactions = userTransactionsData.map((t: any) => ({
            id: t.id || t.transaction_id,
            user_id: t.user_id || userId,
            user_name: t.user_name || t.username || `User ${userId}`,
            type: t.type || 'purchase',
            amount: t.amount ? t.amount.toString() : '0',
            description: t.description || this.getTransactionDescription(t.type),
            created_at: t.created_at || t.createdAt || new Date().toISOString()
          }));

          console.log(`✅ Loaded ${this.transactions.length} transactions for user ${userId}`);
          this.dialogRef = this.dialog.open(this.transactionsDialog, {
            width: '90vw',
            maxWidth: '1200px',
            height: '80vh'
          });
        },
        error: (err) => {
          console.error(`❌ Error loading transactions for user ${userId}:`, err);
          this.showAlert('ไม่สามารถโหลดข้อมูลธุรกรรมของผู้ใช้ได้', 5000);
        }
      });
  }

  // Helper method to generate transaction description based on type
  getTransactionDescription(type: string): string {
    const descriptions: { [key: string]: string } = {
      'purchase': 'การซื้อเกม',
      'deposit': 'การเติมเงิน',
      'refund': 'การคืนเงิน',
      'withdrawal': 'การถอนเงิน',
      'bonus': 'โบนัส',
      'payment': 'การชำระเงิน'
    };

    return descriptions[type] || 'ธุรกรรม';
  }

  // Get transaction type display name
  getTransactionTypeDisplay(type: string): string {
    const typeNames: { [key: string]: string } = {
      'purchase': 'ซื้อเกม',
      'deposit': 'เติมเงิน',
      'refund': 'คืนเงิน',
      'withdrawal': 'ถอนเงิน',
      'bonus': 'โบนัส',
      'payment': 'ชำระเงิน'
    };

    return typeNames[type] || type;
  }

  // Format amount for display
  formatTransactionAmount(amount: any): string {
    if (!amount) return 'THB 0.00';

    const amountNum = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amountNum);
  }

  // Format date for display
  formatTransactionDate(dateString: string): string {
    if (!dateString) return 'ไม่ระบุเวลา';

    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('th-TH', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      return 'วันที่ไม่ถูกต้อง';
    }
  }

  // Get display description
  getDisplayDescription(description: string, type: string): string {
    if (description && description !== 'ไม่มีคำอธิบาย') {
      // ทำความสะอาดคำอธิบาย
      return description.replace('Deposit: $', 'เติมเงิน: THB ')
                       .replace('Purchase #', 'ซื้อเกม #')
                       .replace('$', 'THB ');
    }

    const defaultDescriptions: { [key: string]: string } = {
      'purchase': 'ซื้อเกม',
      'deposit': 'เติมเงินเข้าบัญชี',
      'refund': 'คืนเงิน',
      'withdrawal': 'ถอนเงิน',
      'bonus': 'ได้รับโบนัส',
      'payment': 'ชำระเงิน'
    };

    return defaultDescriptions[type] || 'ธุรกรรม';
  }

  // ================= Alert =================
  showAlert(message: string, duration: number = 3000) {
    const alertDiv = document.createElement('div');
    alertDiv.textContent = message;
    Object.assign(alertDiv.style, {
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: '#333', color: '#fff', padding: '10px 20px',
      borderRadius: '5px', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', zIndex: '9999'
    });
    document.body.appendChild(alertDiv);
    setTimeout(() => {
      if (document.body.contains(alertDiv)) {
        document.body.removeChild(alertDiv);
      }
    }, duration);
  }

  // ================= Helper Methods =================
  getDiscountTypeDisplay(type: string): string {
    return type === 'percent' ? 'เปอร์เซ็นต์' : 'จำนวนเงิน';
  }

  getActiveStatusDisplay(active: boolean): string {
    return active ? 'ใช้งาน' : 'ปิดใช้งาน';
  }

  refreshData() {
    this.loadGames();
    this.loadCategories();
    this.loadDiscountCodes();
    this.showAlert('รีเฟรชข้อมูลเรียบร้อยแล้ว');
  }
}