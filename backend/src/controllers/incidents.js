import { Incident, Patrol, incidentTypes } from '../models/index.js';
import { choice, location, text } from '../utils/validation.js';
import { ApiError, requireRecord, success } from '../utils/apiError.js';
import { ownRecord } from '../middleware/auth.js';
export async function create(req, res) {
  const body = req.body;
  const data = {
    incidentType: choice(body.incidentType, incidentTypes, 'incident type'),
    location: location(body),
    description: text(body.description, 'Description', false),
    imageUrl: req.imageUrl,
    rangerId: req.user._id,
    syncStatus: choice(
      body.syncStatus || 'Synced',
      ['Synced', 'Pending'],
      'sync status',
    ),
  };
  if (body.patrolId) {
    const patrol = ownRecord(
      requireRecord(await Patrol.findById(body.patrolId), 'Patrol'),
      req.user,
    );
    if (patrol.status !== 'Active')
      throw new ApiError(
        409,
        'Incidents can only be linked to an active patrol',
      );
    data.patrolId = patrol._id;
  }
  success(
    res,
    await Incident.create(data),
    'Incident created successfully',
    201,
  );
}
export async function list(req, res) {
  const filter = {};
  if (req.user.role === 'RANGER') filter.rangerId = req.user._id;
  if (req.params.rangerId) {
    if (
      req.user.role === 'RANGER' &&
      req.params.rangerId !== String(req.user._id)
    )
      throw new ApiError(403, 'You can only view your own incidents');
    filter.rangerId = req.params.rangerId;
  }
  success(
    res,
    await Incident.find(filter)
      .populate('rangerId', 'name')
      .sort({ createdAt: -1 }),
  );
}
export async function details(req, res) {
  success(
    res,
    ownRecord(
      requireRecord(
        await Incident.findById(req.params.id).populate('rangerId', 'name'),
        'Incident',
      ),
      req.user,
    ),
  );
}
export async function status(req, res) {
  success(
    res,
    requireRecord(
      await Incident.findByIdAndUpdate(
        req.params.id,
        {
          status: choice(
            req.body.status,
            ['Reported', 'Under Review', 'Resolved'],
            'incident status',
          ),
        },
        { new: true, runValidators: true },
      ),
      'Incident',
    ),
    'Incident status updated',
  );
}
