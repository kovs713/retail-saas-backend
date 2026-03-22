import { AdjustStockDto } from './adjust-stock.dto';

import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

describe('AdjustStockDto', () => {
  it('should pass validation with positive adjustment', async () => {
    const dto = plainToClass(AdjustStockDto, { adjustment: 50 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with negative adjustment', async () => {
    const dto = plainToClass(AdjustStockDto, { adjustment: -30 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with zero adjustment', async () => {
    const dto = plainToClass(AdjustStockDto, { adjustment: 0 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should pass validation with decimal adjustment', async () => {
    const dto = plainToClass(AdjustStockDto, { adjustment: 10.5 });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('should fail validation without adjustment', async () => {
    const dto = plainToClass(AdjustStockDto, {});

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('adjustment');
  });

  it('should fail validation with non-number adjustment', async () => {
    const dto = plainToClass(AdjustStockDto, { adjustment: 'fifty' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('adjustment');
  });

  it('should fail validation with string number', async () => {
    const dto = plainToClass(AdjustStockDto, { adjustment: '50' });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.map((e) => e.property)).toContain('adjustment');
  });
});
