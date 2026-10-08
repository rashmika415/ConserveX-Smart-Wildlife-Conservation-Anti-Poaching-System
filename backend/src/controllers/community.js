import { CommunityReport, responseActions } from '../models/index.js';
import { choice, text, location, number } from '../utils/validation.js';
import { ApiError, success, requireRecord } from '../utils/apiError.js';
export async function create(req, res) {
  const body = req.body;
  const numberOfElephants = number(
    body.numberOfElephants,
    'Number of elephants',
    1,
    1000,
  );
  if (!Number.isInteger(numberOfElephants))
    throw new ApiError(400, 'Number of elephants must be a whole number');
  const record = await CommunityReport.create({
    landmark: text(body.landmark, 'Nearest location / landmark', true, 200),
    location: location(body, true),
    numberOfElephants,
    directionOfMovement: text(
      body.directionOfMovement,
      'Direction of movement',
      false,
      120,
    ),
    description: text(body.description, 'Description', false),
    contact: text(body.contact, 'Contact', false, 120),
    town: text(body.town, 'Town', false, 150),
    district: text(body.district, 'District', false, 150),
    imageUrl: req.imageUrl,
  });
  success(
    res,
    { _id: record._id, status: record.status, createdAt: record.createdAt },
    'Sighting reported successfully',
    201,
  );
}
export const list = async (_req, res) =>
  success(res, await CommunityReport.find().sort({ createdAt: -1 }));
export const details = async (req, res) =>
  success(
    res,
    requireRecord(
      await CommunityReport.findById(req.params.id).populate(
        'responses.responder',
        'name',
      ),
      'Community report',
    ),
  );
export const status = async (req, res) =>
  success(
    res,
    requireRecord(
      await CommunityReport.findByIdAndUpdate(
        req.params.id,
        {
          status: choice(
            req.body.status,
            ['New', 'Reviewing', 'Responding', 'Resolved', 'False Report'],
            'report status',
          ),
        },
        { new: true, runValidators: true },
      ),
      'Community report',
    ),
    'Report status updated',
  );
export async function respond(req, res) {
  const response = {
    action: choice(req.body.action, responseActions, 'response action'),
    notes: text(req.body.notes, 'Response notes', false),
    responder: req.user._id,
    respondedAt: new Date(),
  };
  success(
    res,
    requireRecord(
      await CommunityReport.findByIdAndUpdate(
        req.params.id,
        { $push: { responses: response } },
        { new: true, runValidators: true },
      ),
      'Community report',
    ),
    'Response action recorded',
  );
}
