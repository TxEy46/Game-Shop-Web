import { Routes } from '@angular/router';
import { Shop } from './pages/shop/shop';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Profile } from './pages/profile/profile';
import { Library } from './pages/library/library';
import { Wallet } from './pages/wallet/wallet';
import { Game } from './pages/game/game';
import { Checkout } from './pages/checkout/checkout';
import { Admin } from './pages/admin/admin';
import { Edit } from './pages/edit/edit';
import { AuthGuard } from './guards/auth.guard';
import { GuestGuard } from './guards/guest.guard';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
    {
        path: 'login',
        component: Login,
        canActivate: [GuestGuard] // ห้ามเข้าถึงถ้าล็อกอินอยู่แล้ว
    },
    {
        path: 'register',
        component: Register,
        canActivate: [GuestGuard] // ห้ามเข้าถึงถ้าล็อกอินอยู่แล้ว
    },
    {
        path: 'edit',
        component: Edit,
        canActivate: [AuthGuard] // ต้องล็อกอินถึงเข้าถึงได้
    },
    {
        path: 'shop',
        component: Shop,
        canActivate: [AuthGuard] // ต้องล็อกอินถึงเข้าถึงได้
    },
    {
        path: 'profile',
        component: Profile,
        canActivate: [AuthGuard] // ต้องล็อกอินถึงเข้าถึงได้
    },
    {
        path: 'library',
        component: Library,
        canActivate: [AuthGuard] // ต้องล็อกอินถึงเข้าถึงได้
    },
    {
        path: 'wallet',
        component: Wallet,
        canActivate: [AuthGuard] // ต้องล็อกอินถึงเข้าถึงได้
    },
    {
        path: 'game/:id',
        component: Game,
        canActivate: [AuthGuard] // ต้องล็อกอินถึงเข้าถึงได้
    },
    {
        path: 'checkout',
        component: Checkout,
        canActivate: [AuthGuard] // ต้องล็อกอินถึงเข้าถึงได้
    },
    {
        path: 'admin',
        component: Admin,
        canActivate: [AdminGuard] // ต้องเป็น admin ถึงเข้าถึงได้
    },
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
];