import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';

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
  role: 'user' | 'admin' = 'user';
  avatarFile: File | null = null;
  avatarPreview: string | null = null; // preview user-uploaded avatar
  defaultAvatar: string = 'http://localhost:3000/uploads/default-avatar.png'; // default avatar

  constructor(private http: HttpClient, private router: Router) { }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.avatarFile = input.files[0];

      const reader = new FileReader();
      reader.onload = (e) => this.avatarPreview = e.target?.result as string;
      reader.readAsDataURL(this.avatarFile);
    }
  }

  register() {
    // Validation
    if (!this.username.trim()) { alert("กรุณากรอก Username"); return; }
    if (!this.email.trim() || !this.email.endsWith("@gmail.com")) { alert("กรุณากรอก Email ให้ถูกต้อง และต้องเป็น @gmail.com"); return; }
    if (!this.password || this.password.length < 8) { alert("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    if (!this.role) { alert("กรุณาเลือก Role"); return; }

    if (this.avatarFile) {
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(this.avatarFile.type)) {
        alert("Avatar ต้องเป็นไฟล์ .jpg/.jpeg/.png เท่านั้น"); return;
      }
    }

    const formData = new FormData();
    formData.append('username', this.username);
    formData.append('email', this.email);
    formData.append('password', this.password);
    formData.append('role', this.role);
    if (this.avatarFile) formData.append('avatar', this.avatarFile);

    const url = 'http://localhost:3000/user/register';
    this.http.post<{ id: number; avatar_url?: string }>(url, formData).subscribe({
      next: () => {
        alert('Registration successful! Please login.');
        this.router.navigate(['/']);
      },
      error: err => alert(err.error?.error || 'Registration failed')
    });
  }
}
