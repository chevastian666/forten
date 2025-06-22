// JavaScript wrapper for CreateAccessUseCase
const { v4: uuidv4 } = require('uuid');

class CreateAccessUseCase {
  constructor(accessRepository, eventRepository) {
    this.accessRepository = accessRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const {
      buildingId,
      name,
      phone,
      type,
      validUntil,
      maxUses = 1,
      notes,
      createdBy
    } = input;

    // Generate unique PIN
    const pin = await this.accessRepository.generateUniquePin();

    // Create access entity
    const access = {
      id: uuidv4(),
      buildingId,
      pin,
      name,
      type,
      validFrom: new Date(),
      validUntil: new Date(validUntil),
      maxUses,
      currentUses: 0,
      isActive: true,
      phone,
      createdBy,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate access dates
    const now = new Date();
    const isValid = access.isActive &&
                   now >= access.validFrom &&
                   now <= access.validUntil &&
                   access.currentUses < access.maxUses;
    
    if (!isValid) {
      throw new Error('Invalid access dates');
    }

    // Save access
    const savedAccess = await this.accessRepository.create(access);

    // Create system event
    const event = {
      id: uuidv4(),
      buildingId: savedAccess.buildingId,
      type: 'system',
      description: `Access PIN created for ${savedAccess.name}`,
      severity: 'low',
      resolved: false,
      userId: createdBy,
      metadata: {
        action: 'access_created',
        accessId: savedAccess.id,
        type: savedAccess.type
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.eventRepository.create(event);

    return savedAccess;
  }
}

module.exports = { CreateAccessUseCase };