import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { Constants } from '../../config/constants';

// Angular Material modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './edit.html',
  styleUrls: ['./edit.scss']
})
export class Edit implements OnInit {
  username: string = '';
  email: string = '';
  avatarPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  password: string = '';
  confirmPassword: string = '';

  constructor(private http: HttpClient, private router: Router, private constants: Constants) { }

  ngOnInit(): void {
    this.loadProfile();
  }

  /** โหลดข้อมูลโปรไฟล์ */
  loadProfile(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Token not found, please login again.');
      this.router.navigate(['/']);
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(`${this.constants.API_ENDPOINT}/me`, { headers, withCredentials: true }).subscribe({
      next: (res) => {
        this.username = res.username;
        this.email = res.email;
        // ดึงรูป avatar มาแสดง
        if (res.avatar_url) {
          // แก้ปัญหา avatar URL ไม่ครบ
          this.avatarPreview = res.avatar_url.startsWith('http')
            ? res.avatar_url
            : `${this.constants.API_ENDPOINT}${res.avatar_url}`;
        } else {
          this.avatarPreview = '/assets/default-avatar.png';
        }
      },
      error: (err) => {
        console.error('❌ Failed to load profile:', err);
        alert('Failed to load profile.');
      }
    });
  }

  /** เมื่อผู้ใช้เลือกไฟล์รูป */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => (this.avatarPreview = reader.result); // แสดง preview ทันที
      reader.readAsDataURL(file);
    }
  }

  /** บันทึกการแก้ไขข้อมูลโปรไฟล์ (รวม avatar ด้วย) */
  saveChanges(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Token not found, please login again.');
      this.router.navigate(['/']);
      return;
    }

    if (this.password && this.password !== this.confirmPassword) {
      alert('❌ Password and Confirm Password do not match.');
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    const formData = new FormData();
    formData.append('username', this.username);
    formData.append('email', this.email);
    if (this.password) formData.append('password', this.password);
    if (this.selectedFile) formData.append('avatar', this.selectedFile);

    this.http.post(`${this.constants.API_ENDPOINT}/me/update`, formData, { headers, withCredentials: true }).subscribe({
      next: (res: any) => {
        alert('✅ Profile updated successfully!');
        this.password = '';
        this.confirmPassword = '';
        this.selectedFile = null;

        // เปลี่ยนหน้าไป /profile
        this.router.navigate(['/profile']);
      },
      error: (err) => {
        console.error('❌ Failed to update profile:', err);
        alert('Failed to update profile.');
      }
    });
  }
}
