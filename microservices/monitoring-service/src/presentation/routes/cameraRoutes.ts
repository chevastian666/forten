import { Router } from 'express';
import { CameraController } from '../controllers/CameraController';
import { AuthMiddleware } from '../middleware/AuthMiddleware';
import { RoleMiddleware } from '../middleware/RoleMiddleware';
import { PermissionMiddleware } from '../middleware/PermissionMiddleware';

export function createCameraRoutes(
  cameraController: CameraController,
  authMiddleware: AuthMiddleware,
  roleMiddleware: RoleMiddleware,
  permissionMiddleware: PermissionMiddleware
): Router {
  const router = Router();

  // Apply authentication middleware to all routes
  router.use(authMiddleware.authenticate);

  // Create camera - Admin or Manager only
  router.post(
    '/',
    roleMiddleware.requireRoles(['admin', 'manager']),
    cameraController.createCamera.bind(cameraController)
  );

  // Get cameras - All authenticated users
  router.get(
    '/',
    cameraController.getCameras.bind(cameraController)
  );

  // Get specific camera - All authenticated users
  router.get(
    '/:id',
    cameraController.getCamera.bind(cameraController)
  );

  // Update camera - Admin or Manager only
  router.put(
    '/:id',
    roleMiddleware.requireRoles(['admin', 'manager']),
    cameraController.updateCamera.bind(cameraController)
  );

  // Delete camera - Admin only
  router.delete(
    '/:id',
    roleMiddleware.requireRoles(['admin']),
    cameraController.deleteCamera.bind(cameraController)
  );

  // Update camera status - Admin or Manager only
  router.patch(
    '/:id/status',
    roleMiddleware.requireRoles(['admin', 'manager']),
    cameraController.updateCameraStatus.bind(cameraController)
  );

  // Start live stream - Requires camera:stream permission
  router.post(
    '/:id/stream/live',
    permissionMiddleware.requirePermissions(['camera:stream']),
    cameraController.startLiveStream.bind(cameraController)
  );

  // Start playback stream - Requires camera:playback permission
  router.post(
    '/:id/stream/playback',
    permissionMiddleware.requirePermissions(['camera:playback']),
    cameraController.startPlaybackStream.bind(cameraController)
  );

  // Stop stream - Requires camera:stream permission
  router.delete(
    '/stream/:sessionId',
    permissionMiddleware.requirePermissions(['camera:stream']),
    cameraController.stopStream.bind(cameraController)
  );

  // Capture snapshot - Requires camera:snapshot permission
  router.post(
    '/:id/snapshot',
    permissionMiddleware.requirePermissions(['camera:snapshot']),
    cameraController.captureSnapshot.bind(cameraController)
  );

  // Control PTZ - Requires camera:control permission
  router.post(
    '/:id/ptz',
    permissionMiddleware.requirePermissions(['camera:control']),
    cameraController.controlPTZ.bind(cameraController)
  );

  // Get recordings - Requires camera:playback permission
  router.get(
    '/:id/recordings',
    permissionMiddleware.requirePermissions(['camera:playback']),
    cameraController.getRecordings.bind(cameraController)
  );

  // Download recording - Requires camera:download permission
  router.get(
    '/recordings/:recordingId/download',
    permissionMiddleware.requirePermissions(['camera:download']),
    cameraController.downloadRecording.bind(cameraController)
  );

  // Get active streams - Requires camera:stream permission
  router.get(
    '/streams/active',
    permissionMiddleware.requirePermissions(['camera:stream']),
    cameraController.getActiveStreams.bind(cameraController)
  );

  return router;
}