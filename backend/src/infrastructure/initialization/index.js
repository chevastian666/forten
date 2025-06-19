/**
 * Infrastructure Initialization Module
 * 
 * This module handles the initialization of all clean architecture components
 * including the dependency container, Socket.io integration, and any other
 * infrastructure services that need to be set up at application startup.
 */

const { container } = require('../container');

/**
 * Initializes the clean architecture infrastructure
 * @param {Object} io - Socket.io server instance
 * @returns {Promise<Object>} The initialized container
 */
const initializeInfrastructure = async (io) => {
  try {
    console.log('Initializing clean architecture infrastructure...');

    // Get the SocketEventService from the container
    const socketEventService = container.get('eventService');
    
    // Initialize the service with the Socket.io server
    socketEventService.initialize(io);
    
    // The event service is now initialized with Socket.io
    
    // Update all use cases that depend on the event service
    const { CreateEventUseCase } = require('../../application/use-cases/js-wrappers/event/CreateEventUseCase');
    container.services.set(
      'createEventUseCase',
      new CreateEventUseCase(
        container.get('eventRepository'),
        socketEventService
      )
    );

    console.log('SocketEventService initialized with Socket.io');

    // Initialize any other services that need setup
    // Future services can be initialized here

    console.log('Clean architecture infrastructure initialized successfully');
    
    return container;
  } catch (error) {
    console.error('Failed to initialize infrastructure:', error);
    throw error;
  }
};

/**
 * Gets the dependency container instance
 * @returns {Object} The dependency container
 */
const getContainer = () => {
  return container;
};

/**
 * Clean up resources when shutting down
 */
const cleanup = async () => {
  try {
    console.log('Cleaning up infrastructure resources...');
    
    // Add any cleanup logic here
    // For example: closing database connections, clearing caches, etc.
    
    console.log('Infrastructure cleanup completed');
  } catch (error) {
    console.error('Error during infrastructure cleanup:', error);
  }
};

module.exports = {
  initializeInfrastructure,
  getContainer,
  cleanup
};