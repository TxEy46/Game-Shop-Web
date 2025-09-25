import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { GameDetail } from '../../model/game';
import { Category } from '../../model/category';
import { DiscountCode } from '../../model/discountcode';
import { Transaction } from '../../model/transaction';
import { HeaderAdmin } from '../header-admin/header-admin';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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

  // Countdown
  discountCountdowns: { [key: number]: string } = {};
  countdownIntervals: { [key: number]: any } = {};

  @ViewChild('editDialog', { static: true }) editDialog!: TemplateRef<any>;
  @ViewChild('transactionsDialog', { static: true }) transactionsDialog!: TemplateRef<any>;
  @ViewChild('discountDialog', { static: true }) discountDialog!: TemplateRef<any>;
  @ViewChild('discountManagerDialog', { static: true }) discountManagerDialog!: TemplateRef<any>;

  constructor(private http: HttpClient, private dialog: MatDialog, private router: Router, private snackBar: MatSnackBar) { }

  ngOnInit(): void {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      alert('กรุณาเข้าสู่ระบบก่อน');
      this.router.navigate(['/']);
      return;
    }

    const user = JSON.parse(storedUser);
    if (user.role !== 'admin') {
      alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
      this.router.navigate(['/']);
      return;
    }

    this.loadGames();
    this.loadCategories();
  }

  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) };
  }

  loadGames() {
    this.http.get<GameDetail[]>('http://localhost:3000/game', this.getAuthHeaders())
      .subscribe({
        next: data => this.games = data.map(g => ({ ...g, image_url: g.image_url ? `http://localhost:3000${g.image_url}` : '' })),
        error: err => console.error(err)
      });
  }

  loadCategories() {
    this.http.get<Category[]>('http://localhost:3000/categories', this.getAuthHeaders())
      .subscribe({ next: data => this.categories = data, error: err => console.error(err) });
  }

  // --- เปิด dialog ประวัติธุรกรรมทั้งหมด ---
  viewAllTransactions() {
    this.http.get<Transaction[]>(`http://localhost:3000/admin/transactions`, this.getAuthHeaders())
      .subscribe({
        next: data => {
          this.transactions = data;
          if (this.transactionsDialog) {
            this.dialogRef = this.dialog.open(this.transactionsDialog, {
              width: '90vw',   // ใช้เป็น % ของหน้าจอ
              maxWidth: '700px', // จำกัดความกว้างสูงสุด
              maxHeight: '85vh'   // ความสูงตามต้องการ
            });
          } else {
            console.error("transactionsDialog template not found!");
          }
        },
        error: err => console.error(err)
      });
  }

  openDiscountDialog(code?: DiscountCode) {
    const data = code
      ? {
        ...code,
        end_date: code.end_date ? code.end_date.split('T')[0] : '', // ตัดเวลาออก
        start_date: code.start_date ? code.start_date.split('T')[0] : ''
      }
      : {
        code: '',
        type: 'percent',
        value: 0,
        usage_limit: 0,
        min_total: 0,
        end_date: '',
        start_date: '',
        single_use_per_user: false,
        active: true
      };

    this.dialogRef = this.dialog.open(this.discountDialog, {
      width: '500px',
      maxHeight: '80vh',
      data
    });
  }

  saveDiscountCode(data: DiscountCode) {
    const payload = {
      ...data,
      active: data.active ? 1 : 0,
      start_date: data.start_date || undefined, // เก็บถ้ามี
      end_date: data.end_date // เก็บตรงๆ เป็น string yyyy-MM-dd
    };

    const request$ = data.id
      ? this.http.put(`http://localhost:3000/admin/discount-codes/${data.id}`, payload, this.getAuthHeaders())
      : this.http.post(`http://localhost:3000/admin/discount-codes`, payload, this.getAuthHeaders());

    request$.subscribe({
      next: () => {
        this.loadDiscountCodes();
        this.dialogRef.close();
        alert('บันทึกเรียบร้อยแล้ว');
      },
      error: err => {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการบันทึกโค้ดส่วนลด: ' + err.error?.error);
      }
    });
  }


  deleteDiscountCode(id: number) {
    if (!confirm('คุณต้องการลบโค้ดส่วนลดนี้จริงหรือไม่?')) return;

    this.http.delete(`http://localhost:3000/admin/discount-codes/${id}`, this.getAuthHeaders())
      .subscribe({
        next: () => {
          this.loadDiscountCodes();
          alert('ลบโค้ดส่วนลดเรียบร้อยแล้ว');
        },
        error: err => {
          console.error(err);
          if (err.error?.error?.includes('referenced')) {
            alert('ไม่สามารถลบโค้ดส่วนลดนี้ เนื่องจากยังมีการใช้งานในตารางอื่น');
          } else {
            alert(err.error?.error || 'เกิดข้อผิดพลาดในการลบโค้ดส่วนลด');
          }
        }
      });
  }

  loadDiscountCodes() {
    this.http.get<DiscountCode[]>(`http://localhost:3000/admin/discount-codes`, this.getAuthHeaders())
      .subscribe({
        next: data => {
          // ✅ แปลง active: number → boolean
          this.discountCodes = data.map(d => ({
            ...d,
            active: d.active === 1
          }));
          this.discountCodes.forEach(d => {
            if (d.id !== undefined && d.end_date) {
              this.startDiscountCountdown(d.id, d.end_date);
            }
          });
        },
        error: err => console.error(err)
      });
  }

  startDiscountCountdown(id: number, endDate: string) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (this.countdownIntervals[id]) clearInterval(this.countdownIntervals[id]);

    this.countdownIntervals[id] = setInterval(() => {
      const now = new Date().getTime();
      const distance = end.getTime() - now;

      if (distance <= 0) {
        this.discountCountdowns[id] = 'หมดอายุแล้ว';
        clearInterval(this.countdownIntervals[id]);

        // ✅ อัพเดท active เป็น false
        const code = this.discountCodes.find(d => d.id === id);
        if (code) {
          code.active = false;
          this.http.put(`http://localhost:3000/admin/discount-codes/${id}`,
            { ...code, active: 0 },
            this.getAuthHeaders()
          ).subscribe();
        }
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      this.discountCountdowns[id] = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
  }

  openDiscountManager() {
    this.loadDiscountCodes();
    this.dialogRef = this.dialog.open(this.discountManagerDialog, {
      width: '90vh',
      maxWidth: '800px',
      maxHeight: '80vh'
    });
  }

  // --- Dialog สำหรับเพิ่ม/แก้ไขเกม ---
  openAddGame() {
    const newGame = { id: 0, name: '', price: 0, description: '', category_id: null };
    this.dialogRef = this.dialog.open(this.editDialog, { data: newGame });
    this.dialogRef.afterClosed().subscribe(() => { this.previews.delete(0); this.selectedFiles.delete(0); });
  }

  openEditGame(game: any) {
    this.dialogRef = this.dialog.open(this.editDialog, { data: { ...game } });
    this.dialogRef.afterClosed().subscribe(() => { this.previews.delete(game.id); this.selectedFiles.delete(game.id); });
  }

  // ฟังก์ชันสร้าง alert แบบหายไปเอง (กลางด้านบน)
  showAlert(message: string, duration: number = 3000) {
    const alertDiv = document.createElement('div');
    alertDiv.textContent = message;

    // ตำแหน่งกลางด้านบน
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';

    // สไตล์อื่น ๆ
    alertDiv.style.backgroundColor = '#333';
    alertDiv.style.color = '#fff';
    alertDiv.style.padding = '10px 20px';
    alertDiv.style.borderRadius = '5px';
    alertDiv.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    alertDiv.style.zIndex = '9999';

    document.body.appendChild(alertDiv);

    setTimeout(() => {
      document.body.removeChild(alertDiv);
    }, duration);
  }

  saveGame(game: GameDetail) {
    // ตรวจสอบข้อมูลที่จำเป็น
    if (!game.name) {
      this.showAlert('กรุณาใส่ชื่อเกม');
      return;
    }
    if (!game.price || game.price <= 0) {
      this.showAlert('กรุณาใส่ราคาที่ถูกต้อง');
      return;
    }
    if (!game.category_id || game.category_id <= 0) {
      this.showAlert('กรุณาเลือกหมวดหมู่เกม');
      return;
    }
    if (!game.description || game.description.trim() === '') {
      this.showAlert('กรุณาใส่รายละเอียดเกม');
      return;
    }

    // ลบส่วนตรวจสอบไฟล์ภาพออก → ไม่ alert ถ้าไม่ได้เลือกภาพ
    const file = this.selectedFiles.get(game.id || 0);
    if (file) {
      const formData = new FormData();
      formData.append("name", game.name);
      formData.append("price", game.price.toString());
      formData.append("category_id", (game.category_id || 0).toString());
      formData.append("description", game.description);
      formData.append("image", file);

      const headers = this.getAuthHeaders();
      const request$ = game.id && game.id > 0
        ? this.http.put(`http://localhost:3000/game/${game.id}`, formData, headers)
        : this.http.post('http://localhost:3000/game', formData, headers);

      request$.subscribe(() => {
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
      });
    } else {
      // ถ้าไม่ได้เลือกรูป → ไม่ทำอะไร ไม่ alert
      const formData = new FormData();
      formData.append("name", game.name);
      formData.append("price", game.price.toString());
      formData.append("category_id", (game.category_id || 0).toString());
      formData.append("description", game.description);

      const headers = this.getAuthHeaders();
      const request$ = game.id && game.id > 0
        ? this.http.put(`http://localhost:3000/game/${game.id}`, formData, headers)
        : this.http.post('http://localhost:3000/game', formData, headers);

      request$.subscribe(() => {
        this.loadGames();
        this.showAlert('บันทึกข้อมูลเรียบร้อยแล้ว');
        this.dialogRef.close();
      });
    }
  }

  deleteGame(gameId: number) {
    if (!confirm('ยืนยันการลบเกม?')) return;
    this.http.delete(`http://localhost:3000/game/${gameId}`, this.getAuthHeaders())
      .subscribe({
        next: () => this.loadGames(),
        error: err => {
          if (err.error?.error?.includes('purchased'))
            alert('ไม่สามารถลบเกมนี้ได้ เนื่องจากมีผู้ซื้อไปแล้ว');
          else {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการลบเกม');
          }
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
}
