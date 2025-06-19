// JavaScript wrapper for ValidateAccessUseCase
const { v4: uuidv4 } = require('uuid');

class ValidateAccessUseCase {
  constructor(accessRepository, eventRepository) {
    this.accessRepository = accessRepository;
    this.eventRepository = eventRepository;
  }

  async execute(input) {
    const { pin, buildingId } = input;

    // Find access by PIN
    const access = await this.accessRepository.findByPin(pin);

    if (!access) {
      // Log failed attempt
      if (buildingId) {
        const event = {
          id: uuidv4(),
          buildingId,
          type: 'access_denied',
          description: 'Invalid PIN attempted',
          severity: 'medium',
          resolved: false,
          metadata: { pin },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await this.eventRepository.create(event);
      }

      return {
        valid: false,
        error: 'Invalid PIN'
      };
    }

    // Validate building if provided
    if (buildingId && access.buildingId !== buildingId) {
      return {
        valid: false,
        error: 'PIN not valid for this building'
      };
    }

    // Check if access can be used
    const now = new Date();
    const validFrom = new Date(access.validFrom);
    const validUntil = new Date(access.validUntil);
    const canUse = access.isActive &&
                   now >= validFrom &&
                   now <= validUntil &&
                   access.currentUses < access.maxUses;

    if (!canUse) {
      // Log denied access
      const event = {
        id: uuidv4(),
        buildingId: access.buildingId,
        type: 'access_denied',
        description: `Expired or inactive PIN used by ${access.name}`,
        severity: 'low',
        resolved: false,
        metadata: {
          accessId: access.id,
          reason: !access.isActive ? 'inactive' : (access.currentUses < access.maxUses ? 'expired' : 'no_remaining_uses')
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await this.eventRepository.create(event);

      return {
        valid: false,
        error: 'PIN expired or inactive'
      };
    }

    // Use access
    access.currentUses++;
    await this.accessRepository.update(access.id, {
      currentUses: access.currentUses,
      updatedAt: new Date()
    });

    // Log successful access
    const event = {
      id: uuidv4(),
      buildingId: access.buildingId,
      type: 'access_granted',
      description: `Access granted to ${access.name}`,
      severity: 'low',
      resolved: false,
      metadata: {
        accessId: access.id,
        currentUses: access.currentUses,
        maxUses: access.maxUses
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.eventRepository.create(event);

    return {
      valid: true,
      access: {
        name: access.name,
        type: access.type,
        remainingUses: Math.max(0, access.maxUses - access.currentUses)
      }
    };
  }
}

module.exports = { ValidateAccessUseCase };