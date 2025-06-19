import { IAccessRepository } from '../../../domain/repositories/IAccessRepository';
import { Access } from '../../../domain/entities/Access';

export interface GetAccessByIdUseCaseInput {
  id: string;
}

export class GetAccessByIdUseCase {
  constructor(private accessRepository: IAccessRepository) {}

  async execute(input: GetAccessByIdUseCaseInput): Promise<Access | null> {
    return await this.accessRepository.findById(input.id);
  }
}