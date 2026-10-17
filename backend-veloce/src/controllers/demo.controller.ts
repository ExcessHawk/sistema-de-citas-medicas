/**
 * @file Public demo sessions.
 *
 * EN: Only registered when DEMO_MODE is on. With it off these routes do not
 *     exist at all — they answer 404, not 403, because a 403 would confirm
 *     there is something there.
 * ES: Solo se registra con DEMO_MODE encendido. Apagado, estas rutas no
 *     existen: responden 404 y no 403, porque un 403 confirmaría que hay algo.
 */
import { and, eq } from 'drizzle-orm';
import {
  Body,
  Controller,
  Get,
  Inject,
  InjectDB,
  Post,
  ServiceUnavailableException,
  UseMiddleware,
} from 'veloce-ts';
import { z } from 'zod';
import type { DrizzleDB } from '../db/client';
import { users } from '../db/schema';
import { demoRateLimit } from '../middleware/rate-limit.middleware';
import { AuthService } from '../services/auth.service';
import { DEMO_ACCOUNTS, DEMO_DOMAIN, DEMO_ROLES, demoModeEnabled } from '../demo/demo.constants';

const DemoSessionSchema = z.object({ role: z.enum(DEMO_ROLES) });
type DemoSessionDto = z.infer<typeof DemoSessionSchema>;

@Controller('/api/demo')
export class DemoController {
  constructor(
    @InjectDB() private db: DrizzleDB,
    @Inject(AuthService) private authService: AuthService,
  ) {}

  @Get('/roles')
  roles() {
    return {
      roles: DEMO_ROLES.map((role) => ({ role, email: DEMO_ACCOUNTS[role] })),
    };
  }

  @Post('/session')
  @UseMiddleware(demoRateLimit)
  async session(@Body(DemoSessionSchema) body: DemoSessionDto) {
    if (!demoModeEnabled()) {
      throw new ServiceUnavailableException('Demo mode is off');
    }

    const email = DEMO_ACCOUNTS[body.role];
    if (!email?.endsWith(DEMO_DOMAIN)) {
      throw new ServiceUnavailableException('Unknown demo role');
    }

    const [account] = await this.db
      .select({ id: users.id, isDemo: users.isDemo })
      .from(users)
      .where(and(eq(users.email, email), eq(users.isDemo, true)));

    if (!account) {
      throw new ServiceUnavailableException(
        'La demostración todavía no tiene datos. Corre `bun run demo:seed`.',
      );
    }

    return this.authService.signInDemoAccount(this.db, email);
  }
}
