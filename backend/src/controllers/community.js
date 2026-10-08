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

  const landmark = text(body.landmark, 'Nearest location / landmark', true, 200);

  // Duplicate / Corroborating sighting detection (PDF Section 4 Page 20)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const existingRecent = await CommunityReport.findOne({
    landmark: new RegExp(`^${landmark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    createdAt: { $gte: twoHoursAgo },
    status: { $in: ['New', 'Reviewing', 'Responding'] },
  });

  const record = await CommunityReport.create({
    landmark,
    location: location(body, true),
    numberOfElephants,
    directionOfMovement: text(
      body.directionOfMovement,
      'Direction of movement',
      false,
      120,
    ),
    reportType: choice(
      body.reportType || 'Elephant Sighting',
      ['Elephant Sighting', 'Crop-Raiding Incident'],
      'report type',
    ),
    corroborated: Boolean(existingRecent),
    description: text(body.description, 'Description', false),
    contact: text(body.contact, 'Contact', false, 120),
    town: text(body.town, 'Town', false, 150),
    district: text(body.district, 'District', false, 150),
    imageUrl: req.imageUrl,
  });

  if (existingRecent) {
    existingRecent.responses.push({
      action: 'Monitor Situation',
      notes: `Corroborating sighting: ${numberOfElephants} elephant(s) observed again near ${landmark}.`,
      respondedAt: new Date(),
    });
    await existingRecent.save();
  }

  success(
    res,
    {
      _id: record._id,
      status: record.status,
      createdAt: record.createdAt,
      corroborated: record.corroborated,
    },
    'Sighting reported successfully',
    201,
  );
}

export const list = async (req, res) => {
  const records = await CommunityReport.find().sort({ createdAt: -1 }).lean();
  if (req.user?.role === 'RANGER') {
    return success(
      res,
      records.map((r) => ({ ...r, contact: undefined })),
    );
  }
  success(res, records);
};

export async function sms(req, res) {
  const { message, sender } = req.body;
  if (!message || typeof message !== 'string') {
    throw new ApiError(400, 'SMS message is required');
  }
  const match = message.trim().match(/^ELEPHANT\s+([a-zA-Z0-9\s,\.-]+?)(?:\s+(\d+))?$/i);
  if (!match) {
    throw new ApiError(
      400,
      'Invalid SMS format. Expected: ELEPHANT <location/landmark> [count]',
    );
  }
  const landmark = match[1].trim();
  const count = match[2] ? parseInt(match[2], 10) : 1;
  const record = await CommunityReport.create({
    landmark,
    numberOfElephants: count,
    description: `SMS short-code submission from ${sender || 'Villager'}`,
    contact: sender || 'SMS Short Code (1990)',
    reportType: 'Elephant Sighting',
  });
  success(
    res,
    {
      _id: record._id,
      reply: `Report received for ${landmark}. Wildlife rangers and liaison officers notified. Stay at a safe distance.`,
    },
    'SMS sighting processed',
    201,
  );
}
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
export const status = async (req, res) => {
  const statusValue = choice(
    req.body.status,
    ['New', 'Reviewing', 'Responding', 'Resolved', 'False Report'],
    'report status',
  );
  const update = { status: statusValue };
  if (req.body.action) {
    update.$push = {
      responses: {
        action: choice(req.body.action, responseActions, 'response action'),
        notes: text(req.body.notes, 'Response notes', false),
        responder: req.user._id,
        respondedAt: new Date(),
      },
    };
  }
  return success(
    res,
    requireRecord(
      await CommunityReport.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      }),
      'Community report',
    ),
    'Report status updated',
  );
};
export async function respond(req, res) {
  const response = {
    action: choice(req.body.action, responseActions, 'response action'),
    notes: text(req.body.notes, 'Response notes', false),
    responder: req.user._id,
    respondedAt: new Date(),
  };
  const update = { $push: { responses: response } };
  if (req.body.status) {
    update.status = choice(
      req.body.status,
      ['New', 'Reviewing', 'Responding', 'Resolved', 'False Report'],
      'report status',
    );
  }
  success(
    res,
    requireRecord(
      await CommunityReport.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      }),
      'Community report',
    ),
    'Response action recorded',
  );
}

export async function notifications(_req, res) {
  const reports = await CommunityReport.find({
    status: { $in: ['New', 'Reviewing', 'Responding'] },
  })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  const formatted = reports.map((report) => {
    const count = report.numberOfElephants || 1;
    const location = report.landmark || report.town || 'community area';
    const direction = report.directionOfMovement
      ? ` (moving ${report.directionOfMovement})`
      : '';
    return {
      _id: report._id,
      isCommunityReport: true,
      landmark: report.landmark,
      numberOfElephants: report.numberOfElephants,
      directionOfMovement: report.directionOfMovement,
      status: report.status,
      createdAt: report.createdAt,
      town: report.town,
      district: report.district,
      message: `${count} elephant${count > 1 ? 's' : ''} sighted near ${location}${direction}`,
    };
  });

  success(res, formatted);
}
