// JavaScript wrapper for GetAccessByIdUseCase

class GetAccessByIdUseCase {
  constructor(accessRepository) {
    this.accessRepository = accessRepository;
  }

  async execute(input) {
    const { id } = input;
    return await this.accessRepository.findById(id);
  }
}

module.exports = { GetAccessByIdUseCase };