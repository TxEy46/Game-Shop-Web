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
  ) {}

  private get API_ENDPOINT(): string {
    return this.constants.API_ENDPOINT;
  }

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) { alert('กรุณาเข้าสู่ระบบก่อน'); this.router.navigate(['/']); return; }
    const user = JSON.parse(storedUser);
    if (user.role !== 'admin') { alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้'); this.router.navigate(['/']); return; }

    this.loadGames();
    this.loadCategories();
    this.loadDiscountCodes();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  // ================= Games =================
  loadGames() {
    this.http.get<GameDetail[]>(`${this.API_ENDPOINT}/game`, this.getAuthHeaders())
      .subscribe({
        next: data => this.games = data.map(g => ({ ...g, image_url: g.image_url || '' })),
        error: err => console.error('Error loading games:', err)
      });
  }

  loadCategories() {
    this.http.get<Category[]>(`${this.API_ENDPOINT}/categories`, this.getAuthHeaders())
      .subscribe({
        next: data => this.categories = data,
        error: err => console.error('Error loading categories:', err)
      });
  }

  openAddGame() {
    const newGame: GameDetail = { 
      id: 0, 
      name: '', 
      price: 0, 
      description: '', 
      category_id: 0 // ใช้ 0 แทน null
    };
    this.dialogRef = this.dialog.open(this.editDialog, { data: newGame });
    this.dialogRef.afterClosed().subscribe(() => {
      this.previews.delete(0);
      this.selectedFiles.delete(0);
    });
  }

  openEditGame(game: GameDetail) {
    this.dialogRef = this.dialog.open(this.editDialog, { data: { ...game } });
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
      ? this.http.put(`${this.API_ENDPOINT}/game/admin/${game.id}`, formData, this.getAuthHeaders())
      : this.http.post(`${this.API_ENDPOINT}/game/admin`, formData, this.getAuthHeaders());

    request$.subscribe({
      next: () => {
        if (game.id && game.id > 0) { this.selectedFiles.delete(game.id); this.previews.delete(game.id); }
        else { this.selectedFiles.delete(0); this.previews.delete(0); }

        this.loadGames();
        this.showAlert('บันทึกข้อมูลเรียบร้อยแล้ว');
        this.dialogRef.close();
      },
      error: err => {
        console.error('Error saving game:', err);
        const message = err.error?.message || 'เกิดข้อผิดพลาดในการบันทึกเกม';
        this.showAlert(message);
      }
    });
  }

  deleteGame(gameId: number) {
    if (!confirm('ยืนยันการลบเกม?')) return;
    this.http.delete(`${this.API_ENDPOINT}/game/admin/${gameId}`, this.getAuthHeaders())
      .subscribe({
        next: () => this.loadGames(),
        error: err => {
          console.error('Error deleting game:', err);
          const message = typeof err.error === 'string' && err.error.includes('purchased')
            ? 'ไม่สามารถลบเกมนี้ได้ เนื่องจากมีผู้ซื้อไปแล้ว'
            : 'เกิดข้อผิดพลาดในการลบเกม';
          alert(message);
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
    this.http.get<DiscountCode[]>(`${this.API_ENDPOINT}/discount`, this.getAuthHeaders())
      .subscribe({
        next: data => this.discountCodes = data,
        error: err => console.error('Error loading discount codes:', err)
      });
  }

  openDiscountManager() {
    this.dialogRef = this.dialog.open(this.discountManagerDialog, { width: '800px' });
  }

  openDiscountDialog(data?: DiscountCode) {
    const discountData = data ? { ...data } : {
      id: 0, code: '', type: 'percent', value: 0, usage_limit: 0, min_total: 0,
      end_date: '', single_use_per_user: false, active: true
    };
    this.dialogRef = this.dialog.open(this.discountDialog, { data: discountData });
  }

  saveDiscountCode(data: DiscountCode) {
    if (!data.code || data.code.trim() === '') { this.showAlert('กรุณาใส่รหัสโค้ด'); return; }
    if (!data.value || data.value <= 0) { this.showAlert('กรุณาใส่มูลค่าที่ถูกต้อง'); return; }

    const request$ = data.id && data.id > 0
      ? this.http.put(`${this.API_ENDPOINT}/discount/${data.id}`, data, this.getAuthHeaders())
      : this.http.post(`${this.API_ENDPOINT}/discount`, data, this.getAuthHeaders());

    request$.subscribe({
      next: () => {
        this.loadDiscountCodes();
        this.showAlert('บันทึกข้อมูลเรียบร้อยแล้ว');
        this.dialogRef.close();
      },
      error: err => {
        console.error('Error saving discount code:', err);
        this.showAlert('เกิดข้อผิดพลาดในการบันทึกโค้ดส่วนลด');
      }
    });
  }

  deleteDiscountCode(id: number) {
    if (!confirm('ยืนยันการลบโค้ดส่วนลด?')) return;
    this.http.delete(`${this.API_ENDPOINT}/discount/${id}`, this.getAuthHeaders())
      .subscribe({
        next: () => this.loadDiscountCodes(),
        error: err => {
          console.error('Error deleting discount code:', err);
          this.showAlert('เกิดข้อผิดพลาดในการลบโค้ดส่วนลด');
        }
      });
  }

  // ================= Transactions =================
  viewAllTransactions() {
    this.http.get<Transaction[]>(`${this.API_ENDPOINT}/transactions`, this.getAuthHeaders())
      .subscribe({
        next: data => {
          this.transactions = data;
          this.dialogRef = this.dialog.open(this.transactionsDialog, { width: '800px' });
        },
        error: err => console.error('Error loading transactions:', err)
      });
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
    setTimeout(() => document.body.removeChild(alertDiv), duration);
  }
}
