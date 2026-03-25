import { Organization } from './organization.entity';
import { InvalidOrganizationNameException } from '../../../shared/domain/exceptions';

describe('Organization', () => {
  it('creates a valid organization', () => {
    const organization = Organization.create({
      id: 'org-1',
      name: 'Acme',
    });

    expect(organization.name).toBe('Acme');
  });

  it('rejects invalid names on create', () => {
    expect(() =>
      Organization.create({
        id: 'org-1',
        name: 'a',
      }),
    ).toThrow(InvalidOrganizationNameException);
  });

  it('rejects invalid names on update', () => {
    const organization = Organization.create({
      id: 'org-1',
      name: 'Acme',
    });

    expect(() => organization.updateName('a')).toThrow(InvalidOrganizationNameException);
  });

  it('soft deletes and restores an organization without mutating the original instance', () => {
    const organization = Organization.create({
      id: 'org-1',
      name: 'Acme',
    });

    const deletedOrganization = organization.softDelete();
    const restoredOrganization = deletedOrganization.restore();

    expect(organization.deletedAt).toBeNull();
    expect(deletedOrganization.deletedAt).toBeInstanceOf(Date);
    expect(restoredOrganization.deletedAt).toBeNull();
  });
});
