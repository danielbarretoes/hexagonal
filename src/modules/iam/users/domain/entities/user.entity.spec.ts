import { User } from './user.entity';

describe('User', () => {
  it('soft deletes a user without mutating the original instance', () => {
    const user = User.create({
      id: '3d78f1eb-0d57-4181-bbf6-ec43c1a79dfe',
      email: 'john@example.com',
      passwordHash: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
    });

    const deletedUser = user.softDelete();

    expect(user.deletedAt).toBeNull();
    expect(user.isDeleted).toBe(false);
    expect(deletedUser.deletedAt).toBeInstanceOf(Date);
    expect(deletedUser.isDeleted).toBe(true);
  });
});
