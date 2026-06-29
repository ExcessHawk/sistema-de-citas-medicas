/**
 * @file Authentication service: register, login, profile, password change.
 *
 * EN: Owns bcrypt hashing and the JWT pair issued via Veloce's `JWTProvider`.
 *     Tokens carry `{ sub, id, email, role, roles }`; `roles` is read by the
 *     RBAC plugin (`@Roles(...)`), while `id`/`email`/`role` are convenience
 *     claims read back by `requireUser()`.
 * ES: Encapsula el hashing bcrypt y el par JWT emitido por el `JWTProvider` de
 *     Veloce. Los tokens llevan `{ sub, id, email, role, roles }`; `roles` lo
 *     usa el plugin RBAC (`@Roles(...)`), y `id`/`email`/`role` los relee
 *     `requireUser()`.
 */
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from 'veloce-ts';
import type { JWTProvider } from 'veloce-ts';
import { users, doctors } from '../db/schema';
import type { DrizzleDB } from '../db/client';
import type { RegisterDto, LoginDto, UpdateProfileDto, ChangePasswordDto } from '../dtos/auth.dto';
import type { EmailService } from './email.service';

const SALT_ROUNDS = 12;

export class AuthService {
  constructor(private jwtProvider: JWTProvider) {}

  /** EN: Sign an access token carrying the user's identity + role. */
  private signToken(user: { id: number; email: string; role: 'patient' | 'doctor' | 'admin' }) {
    const { accessToken } = this.jwtProvider.generateTokens({
      sub: String(user.id),
      id: user.id,
      email: user.email,
      role: user.role,
      roles: [user.role],
    });
    return accessToken;
  }

  private async loadDoctorInfo(db: DrizzleDB, userId: number) {
    const [doc] = await db.select().from(doctors).where(eq(doctors.userId, userId));
    return doc ?? null;
  }

  async register(db: DrizzleDB, body: RegisterDto, email?: EmailService) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email));
    if (existing) throw new ConflictException('El email ya está registrado');

    if (body.role === 'doctor' && body.licenseNumber) {
      const [dupLicense] = await db
        .select({ id: doctors.id })
        .from(doctors)
        .where(eq(doctors.licenseNumber, body.licenseNumber));
      if (dupLicense) throw new ConflictException('El número de cédula profesional ya está registrado');
    }

    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({ name: body.name, email: body.email, password: passwordHash, role: body.role })
      .returning({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt });

    if (body.role === 'doctor') {
      // Validated by the DTO refine, but guard anyway.
      if (!body.specialty || !body.licenseNumber || body.consultationFee == null) {
        throw new BadRequestException(
          'Los doctores deben proporcionar especialidad, cédula profesional y tarifa de consulta',
        );
      }
      await db.insert(doctors).values({
        userId: user.id,
        specialty: body.specialty,
        licenseNumber: body.licenseNumber,
        phone: body.phone ?? '',
        address: body.address ?? '',
        consultationFee: String(body.consultationFee),
        availableHours: body.availableHours ?? [],
      });
    }

    const token = this.signToken(user);

    if (email) {
      email.sendWelcomeEmail(user.email, user.name).catch(() => {
        /* best-effort */
      });
    }

    return { message: 'Usuario registrado exitosamente', token, user };
  }

  async login(db: DrizzleDB, body: LoginDto) {
    const [user] = await db.select().from(users).where(eq(users.email, body.email));
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(body.password, user.password);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const token = this.signToken(user);
    const doctorInfo = user.role === 'doctor' ? await this.loadDoctorInfo(db, user.id) : null;

    const { password: _pw, ...safe } = user;
    return { message: 'Login exitoso', token, user: { ...safe, doctorInfo } };
  }

  async getProfile(db: DrizzleDB, userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { password: _pw, ...safe } = user;
    const doctorInfo = user.role === 'doctor' ? await this.loadDoctorInfo(db, userId) : null;
    return { ...safe, doctorInfo };
  }

  async updateProfile(db: DrizzleDB, userId: number, role: string, body: UpdateProfileDto) {
    if (body.name) {
      await db
        .update(users)
        .set({ name: body.name, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    if (role === 'doctor') {
      const docPatch: Record<string, unknown> = {};
      if (body.phone !== undefined) docPatch.phone = body.phone;
      if (body.address !== undefined) docPatch.address = body.address;
      if (body.specialty !== undefined) docPatch.specialty = body.specialty;
      if (body.consultationFee !== undefined) docPatch.consultationFee = String(body.consultationFee);
      if (body.availableHours !== undefined) docPatch.availableHours = body.availableHours;
      if (Object.keys(docPatch).length > 0) {
        docPatch.updatedAt = new Date();
        await db.update(doctors).set(docPatch).where(eq(doctors.userId, userId));
      }
    }

    return this.getProfile(db, userId);
  }

  async changePassword(db: DrizzleDB, userId: number, body: ChangePasswordDto) {
    const [user] = await db.select({ password: users.password }).from(users).where(eq(users.id, userId));
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const ok = await bcrypt.compare(body.currentPassword, user.password);
    if (!ok) throw new BadRequestException('Contraseña actual incorrecta');

    const newHash = await bcrypt.hash(body.newPassword, SALT_ROUNDS);
    await db.update(users).set({ password: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
    return { message: 'Contraseña actualizada exitosamente' };
  }
}
