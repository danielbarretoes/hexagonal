import { TransactionalEmailJobHandler } from './transactional-email-job.handler';
import { NonRetryableJobError } from './errors/non-retryable-job.error';

describe('TransactionalEmailJobHandler', () => {
  const send = jest.fn();
  const findByJobIdAndHandler = jest.fn();
  const create = jest.fn();
  const findByIdForUpdate = jest.fn();
  const update = jest.fn();
  const runInTransaction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    runInTransaction.mockImplementation(async (operation: () => Promise<unknown>) => operation());
  });

  it('does not resend an email when a receipt already exists', async () => {
    findByJobIdAndHandler.mockResolvedValue({
      jobId: 'job-1',
      handler: 'transactional_email',
      createdAt: new Date(),
    });
    findByIdForUpdate.mockResolvedValue({
      id: 'job-1',
      status: 'published',
      markCompleted: () => ({
        id: 'job-1',
        status: 'completed',
      }),
    });
    update.mockResolvedValue(undefined);

    const handler = new TransactionalEmailJobHandler(
      { send } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate, update } as never,
      { runInTransaction } as never,
    );

    await handler.handle({
      jobId: 'job-1',
      payload: {
        type: 'welcome',
        to: 'owner@example.com',
        recipientName: 'Owner',
      },
    });

    expect(send).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      id: 'job-1',
      status: 'completed',
    });
  });

  it('locks the outbox row before sending and records completion once', async () => {
    findByJobIdAndHandler.mockResolvedValue(null);
    findByIdForUpdate.mockResolvedValue({
      id: 'job-2',
      status: 'published',
      markCompleted: () => ({
        id: 'job-2',
        status: 'completed',
      }),
    });
    send.mockResolvedValue(undefined);

    const handler = new TransactionalEmailJobHandler(
      { send } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate, update } as never,
      { runInTransaction } as never,
    );

    await handler.handle({
      jobId: 'job-2',
      payload: {
        type: 'welcome',
        to: 'owner@example.com',
        recipientName: 'Owner',
      },
    });

    expect(findByIdForUpdate).toHaveBeenCalledWith('job-2');
    expect(send).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      id: 'job-2',
      status: 'completed',
    });
  });

  it('validates every supported transactional email payload type', () => {
    const handler = new TransactionalEmailJobHandler(
      { send } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate, update } as never,
      { runInTransaction } as never,
    );

    expect(
      handler.validate({
        type: 'password_reset',
        to: 'owner@example.com',
        recipientName: 'Owner',
        resetToken: 'reset-token',
        expiresInMinutes: 15,
      }),
    ).toEqual(
      expect.objectContaining({
        type: 'password_reset',
      }),
    );
    expect(
      handler.validate({
        type: 'email_verification',
        to: 'owner@example.com',
        recipientName: 'Owner',
        verificationToken: 'verify-token',
        expiresInHours: 24,
      }),
    ).toEqual(
      expect.objectContaining({
        type: 'email_verification',
      }),
    );
    expect(
      handler.validate({
        type: 'organization_invitation',
        to: 'owner@example.com',
        organizationName: 'Acme',
        roleCode: 'member',
        invitationToken: 'invite-token',
        expiresInDays: 7,
      }),
    ).toEqual(
      expect.objectContaining({
        type: 'organization_invitation',
      }),
    );
    expect(
      handler.validate({
        type: 'welcome',
        to: 'owner@example.com',
        recipientName: 'Owner',
      }),
    ).toEqual(
      expect.objectContaining({
        type: 'welcome',
      }),
    );
  });

  it('rejects malformed or unsupported transactional email payloads', () => {
    const handler = new TransactionalEmailJobHandler(
      { send } as never,
      { findByJobIdAndHandler, create } as never,
      { findByIdForUpdate, update } as never,
      { runInTransaction } as never,
    );

    expect(() => handler.validate(null)).toThrow(NonRetryableJobError);
    expect(() =>
      handler.validate({
        type: 'password_reset',
        to: 'owner@example.com',
      }),
    ).toThrow('Invalid password reset payload');
    expect(() =>
      handler.validate({
        type: 'unsupported',
        to: 'owner@example.com',
      }),
    ).toThrow('Unsupported transactional email type: unsupported');
  });
});
