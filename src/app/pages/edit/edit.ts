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
import { Header } from "../header/header";

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
    Header
],
  templateUrl: './edit.html',
  styleUrls: ['./edit.scss']
})
export class Edit implements OnInit {
  username: string = '';
  email: string = '';
  avatarPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  currentPassword: string = ''; // เปลี่ยนจาก password เป็น currentPassword
  newPassword: string = ''; // เพิ่ม newPassword
  confirmPassword: string = '';
  isLoading: boolean = false;
  originalUsername: string = '';
  originalEmail: string = '';

  constructor(private http: HttpClient, private router: Router, private constants: Constants) { }

  ngOnInit(): void {
    this.loadProfile();
  }

  /** โหลดข้อมูลโปรไฟล์ */
  loadProfile(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Token not found, please login again.');
      this.router.navigate(['/login']);
      return;
    }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<any>(`${this.constants.API_ENDPOINT}/profile`, {
      headers,
      withCredentials: true
    }).subscribe({
      next: (res) => {
        console.log('Profile data:', res);

        const userData = res.user || res;

        this.username = userData.username || '';
        this.email = userData.email || '';

        // เก็บค่าเดิมเพื่อเปรียบเทียบ
        this.originalUsername = this.username;
        this.originalEmail = this.email;

        if (userData.avatar_url) {
          this.avatarPreview = this.resolveImageUrl(userData.avatar_url);
        } else {
          this.avatarPreview = '/assets/profile-placeholder.png';
        }
      },
      error: (err) => {
        console.error('❌ Failed to load profile:', err);
        alert('Failed to load profile.');
      }
    });
  }

  /** แก้ไข URL รูปภาพ */
  private resolveImageUrl(url: string): string {
    if (!url) return '/assets/profile-placeholder.png';

    if (url.startsWith('http')) {
      return url;
    } else {
      return `${this.constants.API_ENDPOINT}${url.startsWith('/') ? url : '/' + url}`;
    }
  }

  /** เมื่อผู้ใช้เลือกไฟล์รูป */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // ตรวจสอบเฉพาะขนาดไฟล์ (5MB)
      const maxSize = 5 * 1024 * 1024;

      if (file.size > maxSize) {
        alert('❌ ขนาดไฟล์ต้องไม่เกิน 5MB');
        event.target.value = ''; // ล้าง input file
        return;
      }

      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.avatarPreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  /** ลบรูปภาพที่เลือก */
  removeAvatar(): void {
    this.selectedFile = null;
    this.avatarPreview = '/assets/profile-placeholder.png';
  }

  /** ตรวจสอบว่ามีการเปลี่ยนแปลงหรือไม่ */
  hasChanges(): boolean {
    const hasUsernameChanged = this.username !== this.originalUsername;
    const hasEmailChanged = this.email !== this.originalEmail;
    const hasPasswordChanged = !!this.newPassword; // ตรวจสอบ newPassword
    const hasFileChanged = this.selectedFile !== null;

    return hasUsernameChanged || hasEmailChanged || hasPasswordChanged || hasFileChanged;
  }

  /** บันทึกการแก้ไขข้อมูลโปรไฟล์ */
  saveChanges(): void {
    // ตรวจสอบว่ามีการเปลี่ยนแปลงหรือไม่
    if (!this.hasChanges()) {
      alert('⚠️ ไม่มีการเปลี่ยนแปลงใดๆ');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('❌ Token not found, please login again.');
      this.router.navigate(['/login']);
      return;
    }

    // Validation
    if (!this.username.trim()) {
      alert('❌ กรุณากรอกชื่อผู้ใช้');
      return;
    }

    if (!this.email.trim()) {
      alert('❌ กรุณากรอกอีเมล');
      return;
    }

    // ตรวจสอบการเปลี่ยนรหัสผ่าน
    if (this.newPassword) {
      if (!this.currentPassword) {
        alert('❌ กรุณากรอกรหัสผ่านปัจจุบันเพื่อเปลี่ยนรหัสผ่าน');
        return;
      }

      if (!this.confirmPassword) {
        alert('❌ กรุณายืนยันรหัสผ่านใหม่');
        return;
      }

      if (this.newPassword !== this.confirmPassword) {
        alert('❌ รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน');
        return;
      }

      if (this.newPassword.length < 8) {
        alert('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
        return;
      }

      if (this.currentPassword === this.newPassword) {
        alert('❌ รหัสผ่านใหม่ต้องแตกต่างจากรหัสผ่านปัจจุบัน');
        return;
      }
    }

    this.isLoading = true;

    // ใช้ PUT ไปที่ /profile/update ตามที่ Go handler กำหนด
    if (this.selectedFile) {
      this.updateWithFormData();
    } else {
      this.updateWithJson();
    }
  }

  /** อัปเดตด้วย FormData (เมื่อมีไฟล์รูป) */
  private updateWithFormData(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    const formData = new FormData();
    formData.append('username', this.username.trim());
    formData.append('email', this.email.trim());

    // เพิ่มฟิลด์รหัสผ่านตามที่ Go handler ต้องการ
    if (this.newPassword) {
      formData.append('current_password', this.currentPassword);
      formData.append('new_password', this.newPassword);
      formData.append('confirm_password', this.confirmPassword);
    }

    formData.append('avatar', this.selectedFile!);

    // ใช้ PUT ไปที่ /profile/update
    this.http.put(`${this.constants.API_ENDPOINT}/profile/update`, formData, {
      headers,
      withCredentials: true
    }).subscribe({
      next: (res: any) => {
        this.handleUpdateSuccess(res);
      },
      error: (err) => {
        this.handleUpdateError(err);
      }
    });
  }

  /** อัปเดตด้วย JSON (เมื่อไม่มีไฟล์รูป) */
  private updateWithJson(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const updateData: any = {
      username: this.username.trim(),
      email: this.email.trim()
    };

    // เพิ่มฟิลด์รหัสผ่านตามที่ Go handler ต้องการ
    if (this.newPassword) {
      updateData.current_password = this.currentPassword;
      updateData.new_password = this.newPassword;
      updateData.confirm_password = this.confirmPassword;
    }

    // ใช้ PUT ไปที่ /profile/update
    this.http.put(`${this.constants.API_ENDPOINT}/profile/update`, updateData, {
      headers,
      withCredentials: true
    }).subscribe({
      next: (res: any) => {
        this.handleUpdateSuccess(res);
      },
      error: (err) => {
        this.handleUpdateError(err);
      }
    });
  }

  /** จัดการเมื่ออัปเดตสำเร็จ */
  private handleUpdateSuccess(updatedData: any): void {
    this.isLoading = false;
    console.log('✅ Update successful:', updatedData);

    // อัปเดต localStorage ด้วยข้อมูลใหม่จาก response
    this.updateLocalStorage(updatedData.user || updatedData);

    alert('✅ อัปเดตโปรไฟล์สำเร็จ!' + (updatedData.password_changed ? ' (เปลี่ยนรหัสผ่านเรียบร้อย)' : ''));

    // รีเซ็ตฟอร์ม
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.selectedFile = null;

    // ไปหน้า profile
    this.router.navigate(['/profile']);
  }

  /** จัดการเมื่ออัปเดตผิดพลาด */
  private handleUpdateError(err: any): void {
    this.isLoading = false;
    console.error('❌ Failed to update profile:', err);

    if (err.status === 400) {
      alert('❌ ข้อมูลไม่ถูกต้อง: ' + (err.error?.message || 'กรุณาตรวจสอบข้อมูลอีกครั้ง'));
    } else if (err.status === 409) {
      alert('❌ ชื่อผู้ใช้หรืออีเมลนี้มีผู้ใช้แล้ว');
    } else if (err.status === 401) {
      alert('❌ รหัสผ่านปัจจุบันไม่ถูกต้อง');
    } else if (err.status === 405) {
      alert('❌ Method ไม่ถูกต้อง');
    } else {
      alert('❌ ไม่สามารถอัปเดตโปรไฟล์ได้ กรุณาลองใหม่');
    }
  }

  /** อัปเดตข้อมูลใน localStorage ด้วยข้อมูลใหม่จาก response */
  private updateLocalStorage(updatedData: any): void {
    try {
      // ดึง role เดิมจาก localStorage
      const storedUser = localStorage.getItem('user');
      let currentRole = 'user';

      if (storedUser && storedUser !== 'undefined') {
        try {
          const localUser = JSON.parse(storedUser);
          currentRole = localUser.role || 'user';
        } catch (error) {
          console.error('Error parsing localStorage user:', error);
        }
      }

      // ใช้ข้อมูลจาก response โดยตรง + เก็บ role เดิม
      const userData = {
        id: updatedData.id,
        username: updatedData.username,
        email: updatedData.email,
        role: updatedData.role || currentRole,
        avatar_url: updatedData.avatar_url || updatedData.avatar,
        wallet_balance: updatedData.wallet_balance || updatedData.balance
      };

      console.log('🔄 Updating localStorage with:', userData);

      // อัปเดต localStorage
      localStorage.setItem('user', JSON.stringify(userData));

      // อัปเดตค่าเดิม
      this.originalUsername = updatedData.username;
      this.originalEmail = updatedData.email;

    } catch (error) {
      console.error('Error updating localStorage:', error);
    }
  }

  /** ยกเลิกการแก้ไข */
  cancel(): void {
    if (this.hasChanges()) {
      if (confirm('มีข้อมูลที่ยังไม่ได้บันทึก ยกเลิกการแก้ไข?')) {
        this.router.navigate(['/profile']);
      }
    } else {
      this.router.navigate(['/profile']);
    }
  }
}