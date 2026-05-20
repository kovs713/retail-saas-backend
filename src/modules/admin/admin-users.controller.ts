import { Roles } from '@/common/decorators';
import { ApiResponse as AppApiResponse } from '@/common/dto';
import { PaginationResponse } from '@/common/dto/pagination-response.dto';
import { Role } from '@/common/enums';
import { AuthGuard, RolesGuard } from '@/common/guards';
import { CreateUserDto } from '@/modules/user/dto';
import { UserRepository } from '@/modules/user/repositories';
import { UserService } from '@/modules/user/user.service';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  AdminUserDto,
  AdminUsersQueryDto,
} from './dto';

import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { hash } from 'bcryptjs';

@ApiTags('Admin Users')
@ApiBearerAuth('JWT')
@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all users with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of users',
  })
  async findAll(
    @Query() query: AdminUsersQueryDto,
  ): Promise<PaginationResponse<AdminUserDto>> {
    const result = await this.userService.findAllPaginated(query);

    return {
      success: true,
      data: result.data.map((u) => AdminUserDto.fromEntity(u)),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User details',
  })
  async findOne(
    @Param('id') id: string,
  ): Promise<AppApiResponse<AdminUserDto>> {
    const user = await this.userService.findById(id);
    return { success: true, data: AdminUserDto.fromEntity(user) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 200,
    description: 'User created successfully',
  })
  async create(
    @Body() createDto: AdminCreateUserDto,
  ): Promise<AppApiResponse<AdminUserDto>> {
    const createUserDto = new CreateUserDto();
    createUserDto.email = createDto.email;
    createUserDto.password = createDto.password;
    createUserDto.role = createDto.role;
    createUserDto.shopId = createDto.shopId;

    const user = await this.userService.create(createUserDto);
    return { success: true, data: AdminUserDto.fromEntity(user) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: AdminUpdateUserDto,
  ): Promise<AppApiResponse<AdminUserDto>> {
    const user = await this.userService.findById(id);

    if (updateDto.email && updateDto.email !== user.email) {
      const existing = await this.userRepository.existsByEmailAndNotId(
        updateDto.email,
        id,
      );
      if (existing) {
        throw new ConflictException(
          `User with email "${updateDto.email}" already exists`,
        );
      }
    }

    if (updateDto.password) {
      user.passwordHash = await hash(updateDto.password, 10);
    }

    if (updateDto.email !== undefined) user.email = updateDto.email;
    if (updateDto.role !== undefined) user.role = updateDto.role;
    if (updateDto.isActive !== undefined) user.isActive = updateDto.isActive;
    if (updateDto.shopId !== undefined) user.shopId = updateDto.shopId;

    const updated = await this.userRepository.save(user);
    await this.userService.invalidateCache(updated);

    return { success: true, data: AdminUserDto.fromEntity(updated) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate user (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'User deactivated',
  })
  async remove(@Param('id') id: string): Promise<AppApiResponse<AdminUserDto>> {
    const user = await this.userService.deactivate(id);
    return { success: true, data: AdminUserDto.fromEntity(user) };
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Permanently delete user (hard delete)' })
  @ApiResponse({
    status: 200,
    description: 'User permanently deleted',
  })
  async hardRemove(@Param('id') id: string): Promise<AppApiResponse<null>> {
    await this.userService.hardDelete(id);
    return { success: true, message: 'User permanently deleted' };
  }
}
