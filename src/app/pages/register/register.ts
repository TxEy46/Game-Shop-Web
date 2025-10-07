import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Constants } from '../../config/constants';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    RouterModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register {
  username: string = '';
  email: string = '';
  password: string = '';
  // ❌ ลบ role ออกเลย
  avatarFile: File | null = null;
  avatarPreview: string | null = null;
  defaultAvatar: string;
  isLoading = false;

  constructor(private http: HttpClient, private router: Router, private constants: Constants) {
    this.defaultAvatar = constants.API_ENDPOINT + '/uploads/default-avatar.png';
  }

  register() {
    if (!this.username.trim()) { alert("กรุณากรอก Username"); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email.trim() || !emailRegex.test(this.email)) {
      alert("กรุณากรอก Email ให้ถูกต้อง");
      return;
    }

    if (!this.password || this.password.length < 8) {
      alert("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (this.avatarFile) {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(this.avatarFile.type)) {
        alert("Avatar ต้องเป็นไฟล์ .jpg/.jpeg/.png เท่านั้น");
        return;
      }
      if (this.avatarFile.size > 2 * 1024 * 1024) {
        alert("Avatar ต้องไม่เกิน 2MB");
        return;
      }
    }

    const formData = new FormData();
    formData.append('username', this.username);
    formData.append('email', this.email);
    formData.append('password', this.password);
    // ✅ ไม่ต้องส่ง role (backend จะตั้งเป็น user อัตโนมัติ)
    if (this.avatarFile) formData.append('avatar', this.avatarFile);

    this.isLoading = true;
    this.http.post(`${this.constants.API_ENDPOINT}/register`, formData).subscribe({
      next: () => {
        this.isLoading = false;
        alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        this.router.navigate(['/']);
      },
      error: err => {
        this.isLoading = false;
        const msg = err.error?.message || 'Registration failed';
        alert(msg);
      }
    });
  }

  getAvatarPreview(): string {
    return this.avatarPreview || this.defaultAvatar;
  }
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.avatarFile = input.files[0];

      const reader = new FileReader();
      reader.onload = e => this.avatarPreview = e.target?.result as string;
      reader.readAsDataURL(this.avatarFile);
    }
  }

}
