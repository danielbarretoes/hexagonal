/**
 * Paginated Response
 * Standardized pagination wrapper for list responses.
 * Provides metadata for frontend pagination UI.
 * Part of Shared Kernel - can be used across bounded contexts.
 */

export interface PaginationMeta {
  readonly totalItems: number;
  readonly itemCount: number;
  readonly itemsPerPage: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
}

export interface IPaginated<T> {
  readonly items: T[];
  readonly meta: PaginationMeta;
}

export class Paginated<T> implements IPaginated<T> {
  public readonly items: T[];
  public readonly meta: PaginationMeta;

  private constructor(items: T[], meta: PaginationMeta) {
    this.items = items;
    this.meta = meta;
  }

  static create<T>(items: T[], totalItems: number, page: number, limit: number): Paginated<T> {
    const totalPages = Math.ceil(totalItems / limit);

    return new Paginated<T>(items, {
      totalItems,
      itemCount: items.length,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    });
  }

  toJSON(): { items: T[]; meta: PaginationMeta } {
    return {
      items: this.items,
      meta: this.meta,
    };
  }
}
