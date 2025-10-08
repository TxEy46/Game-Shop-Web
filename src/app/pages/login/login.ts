// login.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Constants } from '../../config/constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login {
  
  // Form data - ใช้ชื่อตัวแปรตาม template ของคุณ
  email: string = '';
  password: string = '';
  
  // UI state
  isLoading: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private constants: Constants
  ) {}

  // ฟังก์ชัน login
  login(): void {
    // Validation
    if (!this.email || !this.password) {
      this.showError('Please enter both username/email and password');
      return;
    }

    this.isLoading = true;

    const loginData = {
      identifier: this.email, // ใช้ identifier ตาม API
      password: this.password
    };

    this.http.post<any>(`${this.constants.API_ENDPOINT}/login`, loginData, {
      withCredentials: true // เพิ่ม withCredentials
    })
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          
          // บันทึกข้อมูลผู้ใช้ - แก้ไขตามนี้
          localStorage.setItem('token', response.token);
          
          // สร้าง user object ตามที่ Game component คาดหวัง
          const userData = {
            id: response.user_id || response.id,
            username: response.username,
            email: response.email,
            role: response.role,
            avatar_url: response.avatar_url || '',
            wallet_balance: response.wallet_balance || 0
          };
          
          // บันทึก user object ลง localStorage
          localStorage.setItem('user', JSON.stringify(userData));
          
          // บันทึกแยกตาม field (optional)
          localStorage.setItem('user_id', userData.id.toString());
          localStorage.setItem('username', userData.username);
          localStorage.setItem('email', userData.email);
          localStorage.setItem('role', userData.role);

          this.showSuccess('Login successful!');
          
          // นำทางไปยังหน้าหลัก
          if (response.role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/shop']);
          }
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login error:', error);
          
          if (error.status === 401) {
            this.showError('Invalid username/email or password');
          } else if (error.status === 400) {
            this.showError('Invalid input data');
          } else if (error.status === 0) {
            this.showError('Cannot connect to server. Please check your connection.');
          } else {
            this.showError('Login failed. Please try again.');
          }
        }
      });
  }

  // ฟังก์ชันแสดงข้อความสำเร็จ
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  // ฟังก์ชันแสดงข้อความ error
  private showError(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // ฟังก์ชันล้างฟอร์ม
  resetForm(): void {
    this.email = '';
    this.password = '';
  }

  // ฟังก์ชันทดสอบ login ด้วยบัญชี demo
  useDemoAccount(accountType: 'user' | 'admin'): void {
    if (accountType === 'user') {
      this.email = 'testuser';
      this.password = 'password123';
    } else {
      this.email = 'admin';
      this.password = 'admin123';
    }
  }
}