import {
  Animal,
  Collar,
  CollarReading,
  RiskZone,
  Alert,
} from '../models/index.js';
import { ApiError, success, requireRecord } from '../utils/apiError.js';
import { recordReading } from '../services/tracking.js';
export async function animals(_req, res) {
  const [animals, collars] = await Promise.all([
    Animal.find().lean(),
    Collar.find().lean(),
  ]);
  success(
    res,
    animals.map((animal) => ({
      ...animal,
      collar: collars.find((collar) => collar.collarId === animal.collarId),
    })),
  );
}
export const animal = async (req, res) => {
  const animal = requireRecord(
    await Animal.findById(req.params.id).lean(),
    'Animal',
  );
  success(res, {
    ...animal,
    collar: await Collar.findOne({ collarId: animal.collarId }),
  });
};
export const collars = async (_req, res) =>
  success(res, await Collar.find().populate('animalId'));
export const zones = async (_req, res) => success(res, await RiskZone.find());
export const reading = async (req, res) =>
  success(res, await recordReading(req.body), 'Collar reading saved', 201);
export const history = async (req, res) =>
  success(
    res,
    await CollarReading.find({ collarId: req.params.collarId })
      .sort({ timestamp: -1 })
      .limit(100),
  );
const populate = (query) =>
  query
    .populate('animalId')
    .populate('zoneId')
    .populate('acknowledgedBy', 'name')
    .populate('resolvedBy', 'name');
export const alerts = async (_req, res) =>
  success(res, await populate(Alert.find().sort({ updatedAt: -1 })));
export const alert = async (req, res) =>
  success(
    res,
    requireRecord(await populate(Alert.findById(req.params.id)), 'Alert'),
  );
export async function acknowledge(req, res) {
  requireRecord(await Alert.findById(req.params.id), 'Alert');
  const alert = await Alert.findOneAndUpdate(
    { _id: req.params.id, status: 'New' },
    {
      status: 'Acknowledged',
      acknowledgedBy: req.user._id,
      acknowledgedAt: new Date(),
    },
    { new: true },
  );
  if (!alert) throw new ApiError(409, 'Only new alerts can be acknowledged');
  success(res, alert, 'Alert acknowledged');
}
export async function resolve(req, res) {
  requireRecord(await Alert.findById(req.params.id), 'Alert');
  const alert = await Alert.findOneAndUpdate(
    { _id: req.params.id, open: true },
    {
      status: 'Resolved',
      open: false,
      resolvedBy: req.user._id,
      resolvedAt: new Date(),
    },
    { new: true },
  );
  if (!alert) throw new ApiError(409, 'Alert is already resolved');
  success(res, alert, 'Alert resolved');
}
