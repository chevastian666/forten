// JavaScript wrapper for GetBuildingsUseCase

class GetBuildingsUseCase {
  constructor(buildingRepository) {
    this.buildingRepository = buildingRepository;
  }

  async execute(input = {}) {
    const { filters = {}, pagination = { page: 1, limit: 10 } } = input;
    return await this.buildingRepository.findAll(filters, pagination);
  }
}

module.exports = { GetBuildingsUseCase };