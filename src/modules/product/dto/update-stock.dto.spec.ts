import { UpdateStockDto } from './update-stock.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('UpdateStockDto', () => {
  it('should pass validation with valid quantity', async () => {
    const dto = plainToClass(UpdateStockDto, { quantity: 100 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with zero quantity', async () => {
    const dto = plainToClass(UpdateStockDto, { quantity: 0 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation with negative quantity', async () => {
    const dto = plainToClass(UpdateStockDto, { quantity: -5 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('quantity');
  });

  it('should fail validation without quantity', async () => {
    const dto = plainToClass(UpdateStockDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('quantity');
  });

  it('should fail validation with non-number quantity', async () => {
    const dto = plainToClass(UpdateStockDto, { quantity: 'hundred' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('quantity');
  });

  it('should fail validation with string number', async () => {
    const dto = plainToClass(UpdateStockDto, { quantity: '100' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('quantity');
  });
});
