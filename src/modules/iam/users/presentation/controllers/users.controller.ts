/**
 * Users controller.
 */

import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { GetUserByIdUseCase } from '../../application/use-cases/get-user-by-id.use-case';
import { GetPaginatedUsersUseCase } from '../../application/use-cases/get-paginated-users.use-case';
import { DeleteUserUseCase } from '../../application/use-cases/delete-user.use-case';
import { RestoreUserUseCase } from '../../application/use-cases/restore-user.use-case';
import { RegisterUserDto } from '../dto/register-user.dto';
import { PaginationQueryDto } from '../../../../../shared/contracts/http/pagination-query.dto';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { UserNotFoundException } from '../../../shared/domain/exceptions';

@Controller('api/v1/users')
export class UsersController {
  constructor(
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly getPaginatedUsersUseCase: GetPaginatedUsersUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly restoreUserUseCase: RestoreUserUseCase,
  ) {}

  @Post()
  async register(@Body() body: RegisterUserDto) {
    const user = await this.registerUserUseCase.execute(body);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPaginated(@Query() query: PaginationQueryDto) {
    return this.getPaginatedUsersUseCase.execute(query.page, query.limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.getUserByIdUseCase.execute(id);

    if (!user) {
      throw new UserNotFoundException(id);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.deleteUserUseCase.execute(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  async restore(@Param('id', new ParseUUIDPipe()) id: string) {
    const user = await this.restoreUserUseCase.execute(id);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
