/**
 * Paginated Tests
 */

import { Paginated } from './paginated';

describe('Paginated', () => {
  describe('create', () => {
    it('should create a paginated result with correct meta for first page', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = Paginated.create(items, 10, 1, 2);

      expect(result.items).toEqual(items);
      expect(result.meta.totalItems).toBe(10);
      expect(result.meta.itemCount).toBe(2);
      expect(result.meta.itemsPerPage).toBe(2);
      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.currentPage).toBe(1);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should create a paginated result with correct meta for middle page', () => {
      const items = [{ id: '3' }, { id: '4' }];
      const result = Paginated.create(items, 10, 2, 2);

      expect(result.meta.currentPage).toBe(2);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should create a paginated result with correct meta for last page', () => {
      const items = [{ id: '9' }, { id: '10' }];
      const result = Paginated.create(items, 10, 5, 2);

      expect(result.meta.currentPage).toBe(5);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should handle empty results', () => {
      const result = Paginated.create([], 0, 1, 10);

      expect(result.items).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
      expect(result.meta.itemCount).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should handle single page results', () => {
      const items = [{ id: '1' }, { id: '2' }];
      const result = Paginated.create(items, 2, 1, 10);

      expect(result.meta.totalPages).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);
    });

    it('should calculate total pages correctly with remainder', () => {
      const items = [{ id: '1' }];
      const result = Paginated.create(items, 5, 1, 2);

      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('toJSON', () => {
    it('should return items and meta as JSON', () => {
      const items = [{ id: '1' }];
      const result = Paginated.create(items, 1, 1, 10);
      const json = result.toJSON();

      expect(json.items).toEqual(items);
      expect(json.meta).toBeDefined();
      expect(json.meta.totalItems).toBe(1);
    });
  });
});
