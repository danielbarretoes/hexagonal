/**
 * Organizations controller.
 */

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateOrganizationUseCase } from '../../application/use-cases/create-organization.use-case';
import { GetOrganizationByIdUseCase } from '../../application/use-cases/get-organization-by-id.use-case';
import { GetPaginatedOrganizationsUseCase } from '../../application/use-cases/get-paginated-organizations.use-case';
import { DeleteOrganizationUseCase } from '../../application/use-cases/delete-organization.use-case';
import { RestoreOrganizationUseCase } from '../../application/use-cases/restore-organization.use-case';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { PaginationQueryDto } from '../../../../../shared/contracts/http/pagination-query.dto';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OrganizationNotFoundException } from '../../../shared/domain/exceptions';

@Controller('api/v1/organizations')
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly getOrganizationByIdUseCase: GetOrganizationByIdUseCase,
    private readonly getPaginatedOrganizationsUseCase: GetPaginatedOrganizationsUseCase,
    private readonly deleteOrganizationUseCase: DeleteOrganizationUseCase,
    private readonly restoreOrganizationUseCase: RestoreOrganizationUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: CreateOrganizationDto) {
    const organization = await this.createOrganizationUseCase.execute(body);

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPaginated(@Query() query: PaginationQueryDto) {
    return this.getPaginatedOrganizationsUseCase.execute(query.page, query.limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id', new ParseUUIDPipe()) id: string) {
    const organization = await this.getOrganizationByIdUseCase.execute(id);

    if (!organization) {
      throw new OrganizationNotFoundException(id);
    }

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.deleteOrganizationUseCase.execute(id);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard)
  async restore(@Param('id', new ParseUUIDPipe()) id: string) {
    const organization = await this.restoreOrganizationUseCase.execute(id);

    return {
      id: organization.id,
      name: organization.name,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    };
  }
}
