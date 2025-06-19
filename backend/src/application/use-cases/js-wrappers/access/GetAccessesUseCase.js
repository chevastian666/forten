// JavaScript wrapper for GetAccessesUseCase

class GetAccessesUseCase {
  constructor(accessRepository) {
    this.accessRepository = accessRepository;
  }

  async execute(input = {}) {
    const { filters = {}, pagination = { page: 1, limit: 20 } } = input;
    
    const result = await this.accessRepository.findAll(filters, pagination);
    
    return {
      accesses: result.data,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    };
  }
}

module.exports = { GetAccessesUseCase };