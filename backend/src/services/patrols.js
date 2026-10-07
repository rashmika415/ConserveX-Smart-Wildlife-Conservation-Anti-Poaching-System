import { Patrol, User, incompleteReasons } from '../models/index.js';
import { text, date, location, choice } from '../utils/validation.js';
import { ApiError, requireRecord } from '../utils/apiError.js';
import { ownRecord } from '../middleware/auth.js';
export async function createPatrol(body, manager) {
  const routeName = text(body.routeName, 'Route name', true, 120);
  const parkName = text(body.parkName, 'Park / area', true, 120);
  const scheduledDate = date(body.scheduledDate, 'Scheduled date');
  const scheduledEndTime = date(body.scheduledEndTime, 'Scheduled end time');
  if (scheduledEndTime <= scheduledDate)
    throw new ApiError(400, 'Scheduled end time must be after the start time');
  const ranger = requireRecord(
    await User.findById(text(body.rangerId, 'Ranger', true, 24)),
    'Ranger',
  );
  if (ranger.role !== 'RANGER')
    throw new ApiError(400, 'Assign a user with the Ranger role');
  if (
    !Array.isArray(body.checkpoints) ||
    !body.checkpoints.length ||
    body.checkpoints.length > 30
  )
    throw new ApiError(400, 'Add between 1 and 30 checkpoints');
  const checkpoints = body.checkpoints.map((item) => ({
    name: text(item.name, 'Checkpoint name', true, 120),
    location: location(item),
  }));
  if (
    await Patrol.exists({
      rangerId: ranger._id,
      status: { $in: ['Assigned', 'Active'] },
      $or: [
        {
          scheduledDate: { $lt: scheduledEndTime },
          scheduledEndTime: { $gt: scheduledDate },
        },
        // Older patrols have no planned end; reserve their time from the start onward.
        { scheduledDate: { $lt: scheduledEndTime }, scheduledEndTime: null },
      ],
    })
  )
    throw new ApiError(
      409,
      'This ranger already has a scheduled or active patrol overlapping these times',
    );
  return Patrol.create({
    routeName,
    parkName,
    scheduledDate,
    scheduledEndTime,
    rangerId: ranger._id,
    checkpoints,
    createdBy: manager._id,
  });
}
export async function rangerPatrol(id, user) {
  return ownRecord(requireRecord(await Patrol.findById(id), 'Patrol'), user);
}
export async function startPatrol(id, user) {
  const patrol = await rangerPatrol(id, user);
  if (patrol.status !== 'Assigned')
    throw new ApiError(409, 'Only an assigned patrol can be started');
  if (await Patrol.exists({ rangerId: user._id, status: 'Active' }))
    throw new ApiError(409, 'End your active patrol before starting another');
  const result = await Patrol.findOneAndUpdate(
    { _id: id, status: 'Assigned' },
    { status: 'Active', startTime: new Date() },
    { new: true },
  );
  if (!result) throw new ApiError(409, 'Patrol has already been started');
  return result;
}
export async function addWaypoint(id, user, body, imageUrl) {
  const patrol = await rangerPatrol(id, user);
  const clientId = text(body.clientId, 'Waypoint ID', false, 100);
  if (clientId && patrol.waypoints.some((point) => point.clientId === clientId))
    return patrol;
  const waypoint = {
    ...(clientId ? { clientId } : {}),
    ...(body.recordedAt
      ? { recordedAt: date(body.recordedAt, 'Recorded time') }
      : {}),
    location: location(body),
    type: choice(
      body.type,
      ['Checkpoint', 'Wildlife', 'Hazard', 'Observation'],
      'waypoint type',
    ),
    description: text(body.description, 'Description', false),
    imageUrl,
  };
  const result = await Patrol.findOneAndUpdate(
    {
      _id: id,
      status: 'Active',
      ...(clientId ? { 'waypoints.clientId': { $ne: clientId } } : {}),
    },
    { $push: { waypoints: waypoint } },
    { new: true, runValidators: true },
  );
  if (!result && clientId) {
    const existing = await rangerPatrol(id, user);
    if (existing.waypoints.some((point) => point.clientId === clientId))
      return existing;
  }
  if (!result)
    throw new ApiError(
      409,
      'Waypoints can only be recorded during an active patrol',
    );
  return result;
}
export async function endPatrol(id, user, body) {
  const patrol = await rangerPatrol(id, user);
  if (patrol.status !== 'Active')
    throw new ApiError(409, 'Only an active patrol can be ended');
  const status = choice(
    body.status || 'Completed',
    ['Completed', 'Incomplete'],
    'end status',
  );
  const incompleteReason =
    status === 'Incomplete'
      ? choice(
          body.incompleteReason,
          incompleteReasons,
          'early termination reason',
        )
      : undefined;
  const incompleteReasonDetails =
    incompleteReason === 'Other'
      ? text(
          body.incompleteReasonDetails,
          'Early termination reason details',
          true,
          2000,
        )
      : undefined;
  const endTime = new Date();
  const result = await Patrol.findOneAndUpdate(
    { _id: id, status: 'Active' },
    {
      status,
      endTime,
      incompleteReason,
      incompleteReasonDetails,
      durationMinutes: Math.round((endTime - patrol.startTime) / 60000),
    },
    { new: true, runValidators: true },
  );
  if (!result) throw new ApiError(409, 'Patrol has already ended');
  return result;
}
