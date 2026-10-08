import { Patrol } from '../models/index.js';
import { ownRecord } from '../middleware/auth.js';
import { ApiError, success, requireRecord } from '../utils/apiError.js';
import * as service from '../services/patrols.js';
export const create = async (req, res) =>
  success(
    res,
    await service.createPatrol(req.body, req.user),
    'Patrol assigned successfully',
    201,
  );
export async function list(req, res) {
  const filter = req.user.role === 'RANGER' ? { rangerId: req.user._id } : {};
  if (req.params.rangerId) {
    if (
      req.user.role === 'RANGER' &&
      req.params.rangerId !== String(req.user._id)
    )
      throw new ApiError(403, 'You can only view your own patrols');
    filter.rangerId = req.params.rangerId;
  }
  success(
    res,
    await Patrol.find(filter)
      .populate('rangerId', 'name')
      .sort({ scheduledDate: -1 }),
  );
}
export const details = async (req, res) =>
  success(
    res,
    ownRecord(
      requireRecord(
        await Patrol.findById(req.params.id).populate('rangerId', 'name'),
        'Patrol',
      ),
      req.user,
    ),
  );
export const start = async (req, res) =>
  success(
    res,
    await service.startPatrol(req.params.id, req.user),
    'Patrol started',
  );
export const waypoint = async (req, res) =>
  success(
    res,
    await service.addWaypoint(req.params.id, req.user, req.body, req.imageUrl),
    'Waypoint recorded',
  );
export const end = async (req, res) =>
  success(
    res,
    await service.endPatrol(req.params.id, req.user, req.body),
    'Patrol ended',
  );
