import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationRole } from '@prisma/client';
import inject from 'light-my-request';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { AdminRoleGuard } from '../src/common/guards/admin-role.guard';
import { AuthRateLimitGuard } from '../src/common/guards/auth-rate-limit.guard';
import { AdminController } from '../src/modules/admin/admin.controller';
import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/jwt-auth.guard';
import { JwtStrategy } from '../src/modules/auth/jwt.strategy';
import { DashboardController } from '../src/modules/dashboard/dashboard.controller';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { MemberStateJob } from '../src/modules/jobs/member-state.job';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { WorkflowsJob } from '../src/modules/workflows/workflows.job';

describe('Critical pilot paths (e2e)', () => {
  let app: INestApplication;

  function api(options: Parameters<typeof inject>[1]) {
    return inject(
      app.getHttpAdapter().getInstance() as Parameters<typeof inject>[0],
      options,
    );
  }

  const authService = {
    signup: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
  const dashboardService = {
    summary: jest.fn(),
  };
  const paymentsService = {
    list: jest.fn(),
    createPendingPayment: jest.fn(),
    get: jest.fn(),
    verifyPayment: jest.fn(),
    rejectPayment: jest.fn(),
  };
  const memberStateJob = {
    run: jest.fn(),
  };
  const workflowsJob = {
    runDueWorkflowSteps: jest.fn(),
  };
  const jwtStrategy = {
    validateAccessToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AppController,
        AuthController,
        DashboardController,
        PaymentsController,
        AdminController,
      ],
      providers: [
        AppService,
        AuthRateLimitGuard,
        JwtAuthGuard,
        AdminRoleGuard,
        { provide: AuthService, useValue: authService },
        { provide: DashboardService, useValue: dashboardService },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: MemberStateJob, useValue: memberStateJob },
        { provide: WorkflowsJob, useValue: workflowsJob },
        { provide: JwtStrategy, useValue: jwtStrategy },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    jwtStrategy.validateAccessToken.mockImplementation((token: string) => {
      if (token === 'owner-token') {
        return {
          sub: 'user-1',
          email: 'owner@ironcore.test',
          role: OrganizationRole.OWNER,
          organizationId: 'org-1',
        };
      }

      if (token === 'admin-token') {
        return {
          sub: 'user-2',
          email: 'admin@ironcore.test',
          role: OrganizationRole.ADMIN,
          organizationId: 'org-1',
        };
      }

      if (token === 'staff-token') {
        return {
          sub: 'user-3',
          email: 'staff@ironcore.test',
          role: OrganizationRole.STAFF,
          organizationId: 'org-1',
        };
      }

      throw new Error(`Unexpected token: ${token}`);
    });
  });

  it('returns the health status used by pilot smoke checks', async () => {
    const response = await api({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      service: 'ironcore-api',
    });
  });

  it('logs in through the public auth route, sets the refresh cookie, and omits the raw refresh token', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      onboardingRequired: false,
      user: {
        id: 'user-1',
        fullName: 'Ada Lovelace',
        email: 'ada@ironcore.test',
        role: OrganizationRole.OWNER,
      },
      organization: {
        id: 'org-1',
        name: 'IronCore Fitness',
        slug: 'ironcore-fitness',
        timezone: 'Africa/Lagos',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        currency: 'NGN',
      },
    });

    const response = await api({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'ada@ironcore.test',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(authService.login).toHaveBeenCalledWith({
      email: 'ada@ironcore.test',
      password: 'password123',
    });
    expect(response.json()).toEqual({
      accessToken: 'access-token',
      onboardingRequired: false,
      user: {
        id: 'user-1',
        fullName: 'Ada Lovelace',
        email: 'ada@ironcore.test',
        role: OrganizationRole.OWNER,
      },
      organization: {
        id: 'org-1',
        name: 'IronCore Fitness',
        slug: 'ironcore-fitness',
        timezone: 'Africa/Lagos',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        currency: 'NGN',
      },
    });
    expect(response.json()).not.toHaveProperty('refreshToken');
    expect(response.cookies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'refreshToken',
          value: 'refresh-token',
          httpOnly: true,
        }),
      ]),
    );
  });

  it('rejects invalid auth payloads before they hit the service layer', async () => {
    const response = await api({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'not-an-email',
        password: 'short',
        ignored: 'field',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('protects the dashboard summary behind bearer auth', async () => {
    const response = await api({
      method: 'GET',
      url: '/api/dashboard/summary',
    });

    expect(response.statusCode).toBe(401);
  });

  it('returns the dashboard summary for the caller organization', async () => {
    dashboardService.summary.mockResolvedValue({
      recoveredRevenue: 125000,
      overdueRevenue: 78000,
      navigationBadges: {
        recovery: 4,
        payments: 1,
        tasks: 5,
        alerts: 5,
      },
    });

    const response = await api({
      method: 'GET',
      url: '/api/dashboard/summary',
      headers: {
        authorization: 'Bearer owner-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      recoveredRevenue: 125000,
      overdueRevenue: 78000,
      navigationBadges: {
        recovery: 4,
        payments: 1,
        tasks: 5,
        alerts: 5,
      },
    });

    expect(dashboardService.summary).toHaveBeenCalledWith('org-1');
  });

  it('verifies a payment inside the caller organization and records the verifier identity', async () => {
    paymentsService.verifyPayment.mockResolvedValue({
      id: 'payment-1',
      status: 'VERIFIED',
      memberId: 'member-1',
    });

    const response = await api({
      method: 'POST',
      url: '/api/payments/payment-1/verify',
      headers: {
        authorization: 'Bearer owner-token',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: 'payment-1',
      status: 'VERIFIED',
      memberId: 'member-1',
    });

    expect(paymentsService.verifyPayment).toHaveBeenCalledWith(
      'org-1',
      'payment-1',
      'user-1',
    );
  });

  it('blocks staff users from manually running admin recovery jobs', async () => {
    const response = await api({
      method: 'POST',
      url: '/api/admin/jobs/update-member-states',
      headers: {
        authorization: 'Bearer staff-token',
      },
      payload: { asOf: '2026-05-27T00:00:00.000Z' },
    });

    expect(response.statusCode).toBe(403);
    expect(memberStateJob.run).not.toHaveBeenCalled();
  });

  it('allows admin users to trigger the member-state recovery job with a specific as-of date', async () => {
    memberStateJob.run.mockResolvedValue({
      skipped: false,
      processedCount: 3,
      errorCount: 0,
      status: 'COMPLETED',
    });

    const response = await api({
      method: 'POST',
      url: '/api/admin/jobs/update-member-states',
      headers: {
        authorization: 'Bearer admin-token',
      },
      payload: { asOf: '2026-05-27T00:00:00.000Z' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      skipped: false,
      processedCount: 3,
      errorCount: 0,
      status: 'COMPLETED',
    });

    expect(memberStateJob.run).toHaveBeenCalledWith(
      new Date('2026-05-27T00:00:00.000Z'),
    );
  });
});
