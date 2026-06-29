/**
 * @file Auth controller — `/api/auth/*`.
 *
 * EN: Public: register, login. Authenticated (any role): profile read/update,
 *     password change. Business logic lives in `AuthService`.
 * ES: Públicas: register, login. Autenticadas (cualquier rol): leer/actualizar
 *     perfil, cambiar contraseña. La lógica vive en `AuthService`.
 */
import { Controller, Get, Post, Put, Body, Ctx, Roles, InjectDB, Inject } from 'veloce-ts';
import type { Context } from 'hono';
import type { DrizzleDB } from '../db/client';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';
import { requireUser } from '../auth/current-user';
import {
  RegisterSchema,
  LoginSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  type RegisterDto,
  type LoginDto,
  type UpdateProfileDto,
  type ChangePasswordDto,
} from '../dtos/auth.dto';

const ANY_ROLE = ['patient', 'doctor', 'admin'];

@Controller('/api/auth')
export class AuthController {
  constructor(
    @InjectDB() private db: DrizzleDB,
    @Inject(AuthService) private authService: AuthService,
    @Inject(EmailService) private emailService: EmailService,
  ) {}

  @Post('/register')
  async register(@Body(RegisterSchema) body: RegisterDto, @Ctx() c: Context) {
    const result = await this.authService.register(this.db, body, this.emailService);
    c.status(201);
    return result;
  }

  @Post('/login')
  async login(@Body(LoginSchema) body: LoginDto) {
    return this.authService.login(this.db, body);
  }

  @Get('/profile')
  @Roles(ANY_ROLE)
  async profile(@Ctx() c: Context) {
    const user = requireUser(c);
    return this.authService.getProfile(this.db, user.id);
  }

  @Put('/profile')
  @Roles(ANY_ROLE)
  async updateProfile(@Body(UpdateProfileSchema) body: UpdateProfileDto, @Ctx() c: Context) {
    const user = requireUser(c);
    return this.authService.updateProfile(this.db, user.id, user.role, body);
  }

  @Put('/change-password')
  @Roles(ANY_ROLE)
  async changePassword(@Body(ChangePasswordSchema) body: ChangePasswordDto, @Ctx() c: Context) {
    const user = requireUser(c);
    return this.authService.changePassword(this.db, user.id, body);
  }
}
