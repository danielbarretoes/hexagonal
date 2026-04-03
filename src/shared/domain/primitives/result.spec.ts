import { Err, Ok, flatMap, isErr, isOk, map, mapErr, unwrap, unwrapOrElse } from './result';

describe('Result helpers', () => {
  it('creates ok and error results with the expected type guards', () => {
    const okResult = Ok(42);
    const errorResult = Err(new Error('boom'));

    expect(isOk(okResult)).toBe(true);
    expect(isErr(okResult)).toBe(false);
    expect(isOk(errorResult)).toBe(false);
    expect(isErr(errorResult)).toBe(true);
  });

  it('maps ok results and leaves error results untouched', () => {
    const okResult = map(Ok(21), (value) => value * 2);
    const error = new Error('boom');
    const errorResult = map(Err(error), (value: number) => value * 2);

    expect(okResult).toEqual(Ok(42));
    expect(errorResult).toEqual(Err(error));
  });

  it('supports flatMap and mapErr transformations', () => {
    const okResult = flatMap(Ok(10), (value) => Ok(value.toString()));
    const errorResult = mapErr(Err(new Error('boom')), (error) => new TypeError(error.message));

    expect(okResult).toEqual(Ok('10'));
    expect(errorResult).toEqual(Err(new TypeError('boom')));
  });

  it('unwraps values with defaults or fallback callbacks', () => {
    const okResult = Ok('value');
    const errorResult = Err(new Error('boom'));

    expect(unwrap(okResult)).toBe('value');
    expect(unwrap(errorResult, 'default')).toBe('default');
    expect(unwrapOrElse(errorResult, (error) => `handled:${error.message}`)).toBe('handled:boom');
  });
});
