// guards/guest.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    if (!token) {
      return true;
    } else {
      // ถ้าล็อกอินอยู่แล้ว ให้ redirect ไปหน้าหลักตาม role
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role === 'admin') {
            this.router.navigate(['/admin']);
          } else {
            this.router.navigate(['/shop']);
          }
        } catch {
          this.router.navigate(['/shop']);
        }
      } else {
        this.router.navigate(['/shop']);
      }
      return false;
    }
  }
}